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
        
        // Явно скрываем всплывающее окно при запуске
        if (this.popupOverlay) {
            this.popupOverlay.classList.add('hidden');
        }
        
        this.init();
        this.setupPromoCodeCopy();
    }
    
    init() {
        this.matchedPairs = 0;
        // Убедимся, что всплывающее окно скрыто при новой игре
        if (this.popupOverlay) {
            this.popupOverlay.classList.add('hidden');
        }
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
            card.appendChild(img);
            
            this.gameBoard.appendChild(card);
            this.cards.push(card);
        });
    }
    
    setupEventListeners() {
        this.cards.forEach(card => {
            card.addEventListener('click', () => this.flipCard(card));
        });
        this.restartBtn.addEventListener('click', () => this.restart());
    }
    
    setupPromoCodeCopy() {
        const promoCode = document.getElementById('promo-code');
        const notification = document.getElementById('copy-notification');
        
        if (promoCode) {
            promoCode.addEventListener('click', () => {
                const textToCopy = promoCode.textContent;
                
                // Копируем текст в буфер обмена
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        // Показываем уведомление
                        notification.classList.add('show');
                        
                        // Скрываем уведомление через 2 секунды
                        setTimeout(() => {
                            notification.classList.remove('show');
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Не удалось скопировать текст: ', err);
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
        } else {
            this.handleMismatch(card1, card2);
        }
    }
    
    handleMatch(card1, card2) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        this.matchedPairs++;
        this.flippedCards = [];
        if (this.matchedPairs === this.cardValues.length) {
            this.showWinPopup();
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
    
    showWinPopup() {
        this.popupOverlay.classList.remove('hidden');
    }
    
    restart() {
        // Скрываем сообщение о победе
        this.popupOverlay.classList.add('hidden');
        
        // Сбрасываем игру
        this.init();
    }
}

// Запускаем игру при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
