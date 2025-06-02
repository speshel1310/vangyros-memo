class MemoryGame {
    constructor() {
        this.gameBoard = document.querySelector('.game-board');
        this.restartBtn = document.getElementById('restart-btn');
        this.winMessage = document.getElementById('win-message');
        this.popupOverlay = document.getElementById('popup-overlay');
        this.cards = [];
        this.flippedCards = [];
        this.isLocked = false;
        this.matchedPairs = 0;
        // Пути к изображениям карточек
        this.cardValues = [
            'images/card1.jpg',
            'images/card2.jpg',
            'images/card3.jpg',
            'images/card4.jpg',
            'images/card5.jpg',
            'images/card6.jpg',
            'images/card7.jpg',
            'images/card8.jpg'
        ];
        
        // Метрики для игры
        this.gameStartTime = null;
        this.lastMoveTime = null;
        this.hasFirstCardBeenClicked = false;
        this.totalMoves = 0;
        this.imageLoadErrors = 0;
        this.winTime = null;
        
        // Явно скрываем всплывающее окно при запуске
        if (this.popupOverlay) {
            this.popupOverlay.classList.add('hidden');
        }
        
        // Отслеживаем закрытие страницы
        window.addEventListener('beforeunload', () => this.handlePageClose());
        
        this.init();
        this.setupPromoCodeCopy();
        this.preloadImages();
    }
    
    init() {
        this.matchedPairs = 0;
        this.totalMoves = 0;
        this.hasFirstCardBeenClicked = false;
        
        // Убедимся, что всплывающее окно скрыто при новой игре
        if (this.popupOverlay) {
            this.popupOverlay.classList.add('hidden');
        }
        
        // Отмечаем начало игры
        this.gameStartTime = Date.now();
        this.lastMoveTime = Date.now();
        
        // Отправляем метрику начала игры
        this.sendMetric('game_started');
        
        this.createCards();
        this.setupEventListeners();
    }
    
    createCards() {
        // Очищаем игровое поле
        this.gameBoard.innerHTML = '';
        this.cards = [];
        
        // Создаем пары карточек
        const values = [...this.cardValues, ...this.cardValues];
        
        // Перемешиваем карточки
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        
        try {
            // Создаем элементы карточек
            values.forEach((value, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.value = value;
                card.dataset.index = index;
                
                // Создаем элемент изображения
                const img = document.createElement('img');
                img.src = value;
                img.alt = 'Карточка суши';
                img.loading = 'lazy'; // Добавляем ленивую загрузку для оптимизации
                
                // Отслеживаем ошибки загрузки
                img.addEventListener('error', () => {
                    this.imageLoadErrors++;
                    this.sendMetric('image_load_error', { image: value });
                });
                
                card.appendChild(img);
                
                this.gameBoard.appendChild(card);
                this.cards.push(card);
            });
        } catch (error) {
            console.error('Ошибка при инициализации игры:', error);
            this.sendMetric('game_initialization_error', { error: error.message });
        }
    }
    
    preloadImages() {
        const startTime = Date.now();
        const totalImages = this.cardValues.length;
        let loadedImages = 0;
        
        this.cardValues.forEach(imageSrc => {
            const img = new Image();
            img.onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) {
                    const loadTime = Date.now() - startTime;
                    this.sendMetric('images_loaded', { loadTime });
                }
            };
            img.onerror = () => {
                this.sendMetric('image_load_error', { image: imageSrc });
            };
            img.src = imageSrc;
        });
    }
    
    setupEventListeners() {
        this.cards.forEach(card => {
            card.addEventListener('click', () => this.flipCard(card));
        });
        this.restartBtn.addEventListener('click', () => {
            this.sendMetric('restart_clicked');
            
            // Если игра не была завершена, учитываем это как abandoned
            if (this.matchedPairs < this.cardValues.length) {
                this.sendMetric('game_abandoned', { 
                    progress: `${this.matchedPairs}/${this.cardValues.length}`,
                    moves: this.totalMoves
                });
            }
            
            this.restart();
        });
    }
    
    setupPromoCodeCopy() {
        const promoCode = document.getElementById('promo-code');
        const notification = document.getElementById('copy-notification');
        
        function fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                success = false;
            }
            document.body.removeChild(textArea);
            return success;
        }
        
        if (promoCode) {
            promoCode.addEventListener('click', () => {
                const textToCopy = promoCode.textContent;
                // Метрика клика по промокоду
                this.sendMetric('promo_code_copy_clicked');
                if (this.winTime) {
                    const timeToClick = Date.now() - this.winTime;
                    this.sendMetric('time_to_promo_code_click', { milliseconds: timeToClick });
                }
                // Копируем текст в буфер обмена
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        notification.textContent = 'Скопировано!';
                        notification.classList.add('show');
                        this.sendMetric('promo_code_copied_success');
                        setTimeout(() => {
                            notification.classList.remove('show');
                            notification.textContent = 'Скопировано!';
                        }, 2000);
                    })
                    .catch(() => {
                        // Fallback через execCommand
                        const fallbackSuccess = fallbackCopyTextToClipboard(textToCopy);
                        if (fallbackSuccess) {
                            notification.textContent = 'Скопировано!';
                            notification.classList.add('show');
                            this.sendMetric('promo_code_copied_success_fallback');
                            setTimeout(() => {
                                notification.classList.remove('show');
                                notification.textContent = 'Скопировано!';
                            }, 2000);
                        } else {
                            notification.textContent = 'Не удалось скопировать';
                            notification.classList.add('show');
                            setTimeout(() => {
                                notification.classList.remove('show');
                                notification.textContent = 'Скопировано!';
                            }, 2000);
                        }
                    });
            });
        }
    }
    
    flipCard(card) {
        if (this.isLocked || 
            this.flippedCards.length === 2 || 
            card.classList.contains('flipped') ||
            card.classList.contains('matched')) {
            return;
        }
        
        // Проверяем, была ли долгая пауза между ходами
        const currentTime = Date.now();
        const timeSinceLastMove = currentTime - this.lastMoveTime;
        if (timeSinceLastMove > 10000) { // 10 секунд
            this.sendMetric('long_pause_between_moves', { pauseDuration: timeSinceLastMove });
        }
        this.lastMoveTime = currentTime;
        
        // Фиксируем клик по карточке
        this.totalMoves++;
        this.sendMetric('card_clicked', { 
            cardIndex: card.dataset.index,
            cardValue: card.dataset.value,
            moveNumber: this.totalMoves
        });
        
        // Отслеживаем первый клик
        if (!this.hasFirstCardBeenClicked) {
            this.hasFirstCardBeenClicked = true;
            const timeToFirstClick = currentTime - this.gameStartTime;
            this.sendMetric('first_card_clicked', { milliseconds: timeToFirstClick });
        }
        
        card.classList.add('flipped');
        this.flippedCards.push(card);
        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }
    
    checkMatch() {
        const [card1, card2] = this.flippedCards;
        const match = card1.dataset.value === card2.dataset.value;
        if (match) {
            this.handleMatch(card1, card2);
            this.sendMetric('cards_matched', { 
                cardValue: card1.dataset.value 
            });
        } else {
            this.handleMismatch(card1, card2);
            this.sendMetric('cards_mismatched', {
                card1: card1.dataset.value,
                card2: card2.dataset.value
            });
        }
    }
    
    handleMatch(card1, card2) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        this.matchedPairs++;
        this.flippedCards = [];
        if (this.matchedPairs === this.cardValues.length) {
            this.handleGameWin();
        }
    }
    
    handleMismatch(card1, card2) {
        this.isLocked = true;
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            this.isLocked = false;
            this.flippedCards = [];
        }, 1000);
    }
    
    handleGameWin() {
        this.winTime = Date.now();
        const gameDuration = this.winTime - this.gameStartTime;
        
        this.sendMetric('game_completed', { 
            durationMs: gameDuration,
            moves: this.totalMoves 
        });
        
        this.showWinPopup();
    }
    
    showWinPopup() {
        this.popupOverlay.classList.remove('hidden');
        this.sendMetric('promo_popup_shown');
        
        // Новая цель для аналитики - игрок прошел игру и увидел баннер с промокодом
        this.sendMetric('game_completed_promo_shown', {
            moves: this.totalMoves,
            durationMs: this.winTime - this.gameStartTime,
            promoCode: document.getElementById('promo-code').textContent
        });
    }
    
    restart() {
        // Скрываем сообщение о победе
        this.popupOverlay.classList.add('hidden');
        
        // Сбрасываем игру
        this.init();
    }
    
    handlePageClose() {
        // Проверяем, была ли игра завершена
        if (this.matchedPairs < this.cardValues.length) {
            this.sendMetric('game_abandoned', { 
                progress: `${this.matchedPairs}/${this.cardValues.length}`,
                moves: this.totalMoves
            });
            this.sendMetric('game_exit');
        }
    }
    
    // Универсальный метод для отправки метрик в Яндекс.Метрику
    sendMetric(name, params = {}) {
        if (window.ym && typeof window.ym === 'function') {
            try {
                window.ym(102286879, 'reachGoal', name, params);
            } catch (e) {
                console.error(`Ошибка отправки метрики ${name}:`, e);
            }
        }
    }
}

// Определяем тип устройства при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const game = new MemoryGame();
    
    // Определяем мобильное устройство или десктоп
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (window.ym && typeof window.ym === 'function') {
        window.ym(102286879, 'reachGoal', isMobile ? 'game_mobile' : 'game_desktop');
    }
});
