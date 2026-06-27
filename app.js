let currentMode = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let bookmarkedQuestions = JSON.parse(localStorage.getItem('dc_bookmarks')) || [];
let userProgress = JSON.parse(localStorage.getItem('dc_progress')) || {
    choice: { total: 0, completed: 0 },
    judge: { total: 0, completed: 0 },
    multiple: { total: 0, completed: 0 }
};

let currentMultipleSelection = [];

document.addEventListener('DOMContentLoaded', () => {
    userProgress.choice.total = QUESTIONS.choice.length;
    userProgress.judge.total = QUESTIONS.judge.length;
    userProgress.multiple.total = QUESTIONS.multiple.length;
    updateHomeStats();
});

function updateHomeStats() {
    const modes = ['choice', 'judge', 'multiple'];
    let totalCompleted = 0;
    let totalQuestions = 0;

    modes.forEach(mode => {
        const stats = userProgress[mode];
        if (stats) {
            totalCompleted += stats.completed;
            totalQuestions += stats.total;
            const percent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const fillEl = document.getElementById(`${mode}-fill`);
            if (fillEl) fillEl.style.width = `${Math.min(100, percent)}%`;
        }
    });

    const totalPercent = totalQuestions > 0 ? (totalCompleted / totalQuestions) * 100 : 0;
    document.getElementById('total-progress').textContent = `${Math.round(totalPercent)}%`;
    document.getElementById('bookmark-count-badge').textContent = bookmarkedQuestions.length;
}

function startMode(mode) {
    currentMode = mode;
    currentQuestionIndex = 0;

    if (mode === 'bookmark') {
        if (bookmarkedQuestions.length === 0) { alert('没有收藏任何题目！'); return; }
        currentQuestions = [...bookmarkedQuestions];
    } else {
        currentQuestions = [...QUESTIONS[mode]];
        currentQuestions.sort(() => Math.random() - 0.5); // shuffle
    }

    if (currentQuestions.length === 0) return;
    
    document.getElementById('quiz-total').textContent = currentQuestions.length;
    switchScreen(document.getElementById('quiz-screen'));
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    let qType = q.type || currentMode;

    document.getElementById('quiz-current').textContent = currentQuestionIndex + 1;
    document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex) / currentQuestions.length) * 100}%`;
    
    const typeNames = { 'judge': '判断题', 'choice': '单选题', 'multiple': '多选题' };
    document.getElementById('question-type-badge').textContent = typeNames[qType] || '题目';
    document.getElementById('question-text').innerHTML = q.question;

    document.getElementById('answer-section').style.display = 'none';
    document.getElementById('judge-options').style.display = 'none';
    document.getElementById('choice-options').style.display = 'none';
    document.getElementById('multiple-options').style.display = 'none';
    
    currentMultipleSelection = [];

    if (qType === 'judge') {
        document.getElementById('judge-options').style.display = 'flex';
        document.querySelectorAll('.judge-btn').forEach(b => b.classList.remove('selected', 'correct', 'incorrect', 'disabled'));
    } else if (qType === 'choice') {
        const container = document.getElementById('choice-options');
        container.innerHTML = '';
        container.style.display = 'flex';
        const optLabels = ['A', 'B', 'C', 'D'];
        (q.options || []).forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn choice-btn';
            btn.innerHTML = `<strong>${optLabels[idx]}.</strong> ${opt}`;
            btn.onclick = () => selectChoice(optLabels[idx], btn);
            container.appendChild(btn);
        });
    } else if (qType === 'multiple') {
        document.getElementById('multiple-options').style.display = 'flex';
        const container = document.getElementById('multiple-btns');
        container.innerHTML = '';
        document.getElementById('multiple-submit').style.display = 'block';
        const optLabels = ['A', 'B', 'C', 'D', 'E'];
        (q.options || []).forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn multiple-btn';
            btn.innerHTML = `<strong>${optLabels[idx]}.</strong> ${opt}`;
            btn.onclick = () => toggleMultipleChoice(optLabels[idx], btn);
            container.appendChild(btn);
        });
    }

    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (bookmarkedQuestions.some(bq => bq.question === q.question)) {
        bookmarkBtn.classList.add('bookmarked'); bookmarkBtn.textContent = '★';
    } else {
        bookmarkBtn.classList.remove('bookmarked'); bookmarkBtn.textContent = '☆';
    }
}

function selectJudge(userAnswer) {
    const q = currentQuestions[currentQuestionIndex];
    if (document.getElementById('answer-section').style.display === 'block') return;
    const buttons = document.querySelectorAll('.judge-btn');
    buttons.forEach(b => b.classList.add('disabled'));

    const correct = userAnswer === q.answer;
    if (correct) { buttons[userAnswer ? 0 : 1].classList.add('correct'); } 
    else {
        buttons[userAnswer ? 0 : 1].classList.add('incorrect');
        buttons[q.answer ? 0 : 1].classList.add('correct');
    }
    showAnswerResult(correct, q.answer ? '正确' : '错误');
}

function selectChoice(userAnswer, btn) {
    const q = currentQuestions[currentQuestionIndex];
    if (document.getElementById('answer-section').style.display === 'block') return;
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.classList.add('disabled'));

    const cleanAnswer = typeof q.answer === 'string' ? q.answer.trim().charAt(0) : '';
    const isCorrect = userAnswer === cleanAnswer;

    if (isCorrect) { btn.classList.add('correct'); } 
    else {
        btn.classList.add('incorrect');
        const optLabels = ['A', 'B', 'C', 'D'];
        const correctIndex = optLabels.indexOf(cleanAnswer);
        if (correctIndex !== -1 && buttons[correctIndex]) {
            buttons[correctIndex].classList.add('correct');
        }
    }
    showAnswerResult(isCorrect, cleanAnswer);
}

function toggleMultipleChoice(userAnswer, btn) {
    if (document.getElementById('answer-section').style.display === 'block') return;
    
    if (currentMultipleSelection.includes(userAnswer)) {
        currentMultipleSelection = currentMultipleSelection.filter(x => x !== userAnswer);
        btn.classList.remove('selected');
    } else {
        currentMultipleSelection.push(userAnswer);
        btn.classList.add('selected');
    }
}

function submitMultiple() {
    const q = currentQuestions[currentQuestionIndex];
    if (document.getElementById('answer-section').style.display === 'block') return;
    if (currentMultipleSelection.length === 0) {
        alert("请至少选择一个选项");
        return;
    }
    
    const buttons = document.querySelectorAll('.multiple-btn');
    buttons.forEach(b => b.classList.add('disabled'));
    document.getElementById('multiple-submit').style.display = 'none';

    // normalize answers for comparison
    const correctAns = [...(q.answer || [])].sort().join('');
    const userAns = [...currentMultipleSelection].sort().join('');
    const isCorrect = correctAns === userAns;
    
    const optLabels = ['A', 'B', 'C', 'D', 'E'];
    buttons.forEach((btn, idx) => {
        const label = optLabels[idx];
        const isSelected = currentMultipleSelection.includes(label);
        const isActuallyCorrect = correctAns.includes(label);
        
        if (isSelected && isActuallyCorrect) btn.classList.add('correct');
        else if (isSelected && !isActuallyCorrect) btn.classList.add('incorrect');
        else if (!isSelected && isActuallyCorrect) btn.classList.add('correct'); // highlight missed
    });

    showAnswerResult(isCorrect, correctAns);
}


function showAnswerResult(isCorrect, correctAnswer) {
    const section = document.getElementById('answer-section');
    const resultEl = document.getElementById('answer-result');
    const correctEl = document.getElementById('answer-correct');

    section.style.display = 'block';
    
    // update completed count
    const q = currentQuestions[currentQuestionIndex];
    if (q.type && userProgress[q.type]) {
        userProgress[q.type].completed = Math.min(userProgress[q.type].total, userProgress[q.type].completed + 1);
        saveProgress();
    }

    if (isCorrect) {
        resultEl.className = 'answer-result correct';
        resultEl.innerHTML = '✓ 回答正确';
    } else {
        resultEl.className = 'answer-result incorrect';
        resultEl.innerHTML = '✗ 回答错误';
    }
    correctEl.innerHTML = `<strong>正确答案：</strong>${correctAnswer}`;
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        renderQuestion();
    } else {
        switchScreen(document.getElementById('result-screen'));
    }
}

function toggleBookmark() {
    const q = currentQuestions[currentQuestionIndex];
    const index = bookmarkedQuestions.findIndex(bq => bq.question === q.question);
    const btn = document.getElementById('bookmark-btn');
    if (index === -1) {
        bookmarkedQuestions.push(q);
        btn.classList.add('bookmarked'); btn.textContent = '★';
    } else {
        bookmarkedQuestions.splice(index, 1);
        btn.classList.remove('bookmarked'); btn.textContent = '☆';
    }
    saveProgress();
}

function saveProgress() {
    localStorage.setItem('dc_progress', JSON.stringify(userProgress));
    localStorage.setItem('dc_bookmarks', JSON.stringify(bookmarkedQuestions));
}

function resetAll() {
    if (confirm('确定清除所有进度和收藏吗？')) {
        localStorage.removeItem('dc_progress');
        localStorage.removeItem('dc_bookmarks');
        location.reload();
    }
}

function switchScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screenEl.classList.add('active');
    window.scrollTo(0, 0);
}
function goHome() {
    updateHomeStats();
    switchScreen(document.getElementById('home-screen'));
}
