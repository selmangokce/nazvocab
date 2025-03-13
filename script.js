/*************************************
 * DEĞİŞKENLER & LOCAL STORAGE
 *************************************/
let vocabData = [];
let currentLevel = 1;
let consecutiveSuccesses = 0; // Art arda kaç başarılı deneme
let currentRound = [];        // Her tur için seçilen sorular
let currentQuestionIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
const PASS_THRESHOLD = 17;    // Turun geçilebilmesi için gereken doğru sayısı
let questionAnswered = false; // Her soruda tıklama hakkı kontrolü

// Sayfa yüklendiğinde kayıtlı ilerlemeyi al
window.addEventListener('load', () => {
  const savedLevel = localStorage.getItem('currentLevel');
  const savedSuccesses = localStorage.getItem('consecutiveSuccesses');
  if (savedLevel) currentLevel = parseInt(savedLevel);
  if (savedSuccesses) consecutiveSuccesses = parseInt(savedSuccesses);
  updateLevelInfo();
});

/*************************************
 * KELİME LİSTESİNİ ÇEK
 *************************************/
fetch('vocab.json')
  .then(response => response.json())
  .then(data => {
    vocabData = data;
    console.log('Kelimeler yüklendi:', vocabData);
  })
  .catch(error => console.error('Kelimeler yüklenirken hata:', error));

/*************************************
 * TESTİ BAŞLAT
 *************************************/
document.getElementById('start-btn').addEventListener('click', startQuiz);

function startQuiz() {
  // Eğer kelimeler henüz yüklenmediyse uyar
  if (vocabData.length === 0) {
    alert("Kelimeler henüz yüklenmedi, az sabırlı ol bebek.");
    return;
  }
  
  // Butonu gizle
  document.getElementById('start-btn').style.display = 'none';

  // Sayaçları sıfırla
  currentQuestionIndex = 0;
  correctAnswers = 0;
  wrongAnswers = 0;

  // Soru listesini hazırla (her seferinde 20 soru)
  prepareCurrentRound();

  // Intro yazısını gizle, soru alanını göster
  document.getElementById('quiz-intro').style.display = 'none';
  document.getElementById('question-container').style.display = 'block';

  // İlk soruyu göster
  showQuestion();
  updateScoreTracker();
}

/*************************************
 * GEÇERLİ TUR SORULARINI HAZIRLA
 *************************************/
function prepareCurrentRound() {
  // Level 1'de: 20 soru, hepsi level 1’den (maks 2 kez tekrar)
  if (currentLevel === 1) {
    let pool = vocabData.filter(w => w.level === 1);
    currentRound = pickWithMaxTwo(pool, 20);
  } else {
    // Level 2 ve üzeri için: 15 soru mevcut seviyeden, 5 soru önceki seviyelerden
    let poolCurrent = vocabData.filter(w => w.level === currentLevel);
    let poolPrevious = vocabData.filter(w => w.level < currentLevel);

    let roundCurrent = pickWithMaxTwo(poolCurrent, 15);
    let roundPrevious = pickWithMaxTwo(poolPrevious, 5);

    currentRound = roundCurrent.concat(roundPrevious);
    shuffleArray(currentRound); // 20 soruyu karıştır
  }
  
  if (currentRound.length === 0) {
    alert("Bu seviye için yeterli kelime yok!");
  }
}

/** Helper to pick `count` random items from `pool`, each item max 2 times. */
function pickWithMaxTwo(pool, count) {
  if (!pool || pool.length === 0) return [];
  let result = [];
  let usageCount = {};

  let attempts = 0;
  while (result.length < count && attempts < count * 10) {
    attempts++;
    let randIndex = Math.floor(Math.random() * pool.length);
    let candidate = pool[randIndex];
    let key = candidate.german + '|' + candidate.turkish;

    usageCount[key] = usageCount[key] || 0;
    if (usageCount[key] < 2) {
      result.push(candidate);
      usageCount[key]++;
    }
  }

  shuffleArray(result);
  return result;
}

/*************************************
 * SORUYU GÖSTER
 *************************************/
function showQuestion() {
  if (currentQuestionIndex >= currentRound.length) {
    endRound();
    return;
  }
  
  questionAnswered = false;

  const questionData = currentRound[currentQuestionIndex];
  document.getElementById('question-text').innerText = questionData.german;
  document.getElementById('feedback-area').innerHTML = '';

  // 3 şık (1 doğru + 2 rastgele yanlış)
  const correctOption = questionData.turkish;
  const distractors = getDistractors(questionData);
  let allOptions = [correctOption, ...distractors];
  shuffleArray(allOptions);

  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = '';

  allOptions.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = option;
    btn.addEventListener('click', () => {
      if (!questionAnswered) {
        questionAnswered = true;
        disableOptionButtons(optionsContainer);
        checkAnswer(option, correctOption);
      }
    });
    optionsContainer.appendChild(btn);
  });
}

/*************************************
 * SEÇENEK BUTONLARINI DEVRE DIŞI BIRAK
 *************************************/
function disableOptionButtons(container) {
  const buttons = container.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.disabled = true;
  });
}

/*************************************
 * CEVABI KONTROL ET
 *************************************/
function checkAnswer(selected, correct) {
  const feedbackArea = document.getElementById('feedback-area');

  // Highlight correct
  highlightCorrectOption(correct);

  if (selected.toLowerCase() === correct.toLowerCase()) {
    correctAnswers++;
    feedbackArea.innerHTML = `
      <p class="correct-feedback">DOĞRU 💕!</p>
      <img src="https://i.pinimg.com/736x/7d/b5/2b/7db52b5f43e102fc3a52ac8df4e36dcf.jpg" alt="Doğru Resim" />
    `;
  } else {
    wrongAnswers++;
    // Highlight the user's wrong choice
    highlightWrongOption(selected);
    feedbackArea.innerHTML = `
      <p class="wrong-feedback">YANLIŞ 💔!</p>
      <img src="https://i.pinimg.com/736x/07/19/84/071984be06de00433204106526040902.jpg" alt="Yanlış Resim" />
    `;
  }

  updateScoreTracker();

  if (wrongAnswers > (20 - PASS_THRESHOLD)) {
    // Fazla yanlış => bitir
    setTimeout(() => {
      endRound();
    }, 3000);
  } else {
    // 3 saniye bekle, sonra sıradaki
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex >= currentRound.length) {
        endRound();
      } else {
        showQuestion();
      }
    }, 3000);
  }
}

/*************************************
 * HIGHLIGHTING
 *************************************/
function highlightCorrectOption(correct) {
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    if (btn.innerText.toLowerCase() === correct.toLowerCase()) {
      btn.classList.add('highlight-correct');
    }
  });
}

function highlightWrongOption(selected) {
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    if (btn.innerText.toLowerCase() === selected.toLowerCase()) {
      btn.classList.add('highlight-wrong');
    }
  });
}

/*************************************
 * TUR BİTİNCE
 *************************************/
function endRound() {
  document.getElementById('question-container').style.display = 'none';

  const quizIntro = document.getElementById('quiz-intro');
  quizIntro.style.display = 'block';

  let resultMsg = `${currentRound.length} sorudan ${correctAnswers} tanesini doğru cevapladın.`;

  if (correctAnswers >= PASS_THRESHOLD) {
    consecutiveSuccesses++;
    resultMsg += `\nHelal aşkıma be, kazandın!`;
    if (consecutiveSuccesses >= 3) {
      currentLevel++;
      consecutiveSuccesses = 0;
      resultMsg += `\nSeviye atladın bebişim! Yeni seviyen: ${currentLevel}.`;
    }
  } else {
    consecutiveSuccesses = 0;
    resultMsg += `\nTesti geçmek için yeterli doğruya ulaşamadın aşkım :(`;
  }

  quizIntro.innerText = resultMsg;

  updateLevelInfo();
  saveProgress();

  // Tekrar başlat butonunu göster
  document.getElementById('start-btn').style.display = 'inline-block';
}

/*************************************
 * SEVİYE VE İLERLEME GÖSTER
 *************************************/
function updateLevelInfo() {
  document.getElementById('current-level').innerText = currentLevel;

  const maxRounds = 3;
  let dots = '';
  for (let i = 0; i < maxRounds; i++) {
    dots += i < consecutiveSuccesses ? '🟢' : '⚪';
  }
  document.getElementById('progress-dots').innerText = `İlerleme: ${dots}`;
}

/*************************************
 * SKOR TAKİBİ
 *************************************/
function updateScoreTracker() {
  document.getElementById('score-tracker').innerText =
    `Doğru: ${correctAnswers} | Yanlış: ${wrongAnswers}`;
}

/*************************************
 * YEREL KAYIT
 *************************************/
function saveProgress() {
  localStorage.setItem('currentLevel', currentLevel.toString());
  localStorage.setItem('consecutiveSuccesses', consecutiveSuccesses.toString());
}

/*************************************
 * DİĞER
 *************************************/
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Distractorları, questionData ile aynı `type` ve
 * level aralığı ±2 içinde olanlardan çekiyoruz.
 * (Aynı kelime hariç 2 tane seçiliyor.)
 */
function getDistractors(questionData) {
  let levelRangeMin = questionData.level - 2;
  let levelRangeMax = questionData.level + 2;
  const correctAnswer = questionData.turkish.toLowerCase();

  let candidates = vocabData.filter(item => {
    return (
      item.type === questionData.type &&
      item.level >= levelRangeMin &&
      item.level <= levelRangeMax &&
      item.turkish.toLowerCase() !== correctAnswer
    );
  });

  shuffleArray(candidates);
  return candidates.slice(0, 2).map(item => item.turkish);
}

document.getElementById("settings-icon").addEventListener("click", function() {
  const newLevel = prompt("Yeni seviye:");
  if (newLevel !== null) {
    const parsedLevel = parseInt(newLevel);
    if (!isNaN(parsedLevel) && parsedLevel > 0) {
      currentLevel = parsedLevel;
      localStorage.setItem("currentLevel", currentLevel.toString());
      updateLevelInfo();
      alert("Seviye güncellendi: " + currentLevel);
    } else {
      alert("Geçerli bir seviye girmen gerekiyor.");
    }
  }
});
