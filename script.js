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
const PASS_THRESHOLD = 3;    // Turun geçilebilmesi için gereken doğru sayısı
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
  // Level 1'de: 20 soru, hepsi level 1’deki 10 kelimeden (tekrarlar mümkün)
  if (currentLevel === 1) {
    let pool = vocabData.filter(w => w.level === 1);
    currentRound = [];
    for (let i = 0; i < 20; i++) {
      let randomIndex = Math.floor(Math.random() * pool.length);
      currentRound.push(pool[randomIndex]);
    }
  } else {
    // Level 2 ve üzeri için: 15 soru mevcut seviyeden, 5 soru önceki seviyelerden
    let poolCurrent = vocabData.filter(w => w.level === currentLevel);
    let poolPrevious = vocabData.filter(w => w.level < currentLevel);
    let roundCurrent = [];
    let roundPrevious = [];

    // 15 soru mevcut seviyeden (tekrarlar mümkün)
    for (let i = 0; i < 15; i++) {
      if (poolCurrent.length === 0) break;
      let randomIndex = Math.floor(Math.random() * poolCurrent.length);
      roundCurrent.push(poolCurrent[randomIndex]);
    }
    // 5 soru önceki seviyelerden (tekrarlar mümkün)
    for (let i = 0; i < 5; i++) {
      if (poolPrevious.length === 0) break;
      let randomIndex = Math.floor(Math.random() * poolPrevious.length);
      roundPrevious.push(poolPrevious[randomIndex]);
    }
    currentRound = roundCurrent.concat(roundPrevious);
    // Toplam 20 soruyu karıştır
    shuffleArray(currentRound);
  }
  
  if (currentRound.length === 0) {
    alert("Bu seviye için yeterli kelime yok!");
  }
}

/*************************************
 * SORUYU GÖSTER
 *************************************/
function showQuestion() {
  if (currentQuestionIndex >= currentRound.length) {
    endRound();
    return;
  }
  
  // Her yeni soruda tıklama kontrolünü sıfırla
  questionAnswered = false;

  const questionData = currentRound[currentQuestionIndex];
  // Sadece Almanca kelimeyi göster (örn. "das Buch")
  document.getElementById('question-text').innerText = questionData.german;
  document.getElementById('feedback-area').innerHTML = '';

  // 3 şık (1 doğru + 2 rastgele yanlış)
  const correctOption = questionData.turkish;
  const distractors = getDistractors(correctOption);

  let allOptions = [correctOption, ...distractors];
  shuffleArray(allOptions);

  // Şık butonlarını oluştur
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

  if (selected.toLowerCase() === correct.toLowerCase()) {
    correctAnswers++;
    feedbackArea.innerHTML = `
      <p class="correct-feedback">DOĞRU 💕!</p>
      <img src="https://i.pinimg.com/736x/7d/b5/2b/7db52b5f43e102fc3a52ac8df4e36dcf.jpg" alt="Doğru Resim" />
    `;
  } else {
    wrongAnswers++;
    feedbackArea.innerHTML = `
      <p class="wrong-feedback">YANLIŞ 💔!</p>
      <img src="https://i.pinimg.com/736x/07/19/84/071984be06de00433204106526040902.jpg" alt="Yanlış Resim" />
    `;
  }

  updateScoreTracker();

  // Eğer doğru cevap sayısı PASS_THRESHOLD'e ulaştıysa, 3 saniye sonra turu bitir
  if (correctAnswers >= PASS_THRESHOLD) {
    setTimeout(() => {
      endRound();
    }, 3000);
  } else {
    // 3 saniye bekle, ardından sonraki soruya geç
    setTimeout(() => {
      currentQuestionIndex++;
      showQuestion();
    }, 3000);
  }
}

/*************************************
 * TUR BİTİNCE
 *************************************/
function endRound() {
  // Soru alanını gizle
  document.getElementById('question-container').style.display = 'none';

  // Sonuç mesajı
  const quizIntro = document.getElementById('quiz-intro');
  quizIntro.style.display = 'block';

  let resultMsg = `${currentRound.length} sorudan ${correctAnswers} tanesini doğru cevapladın.`;

  if (correctAnswers >= PASS_THRESHOLD) {
    consecutiveSuccesses++;
    resultMsg += `\nHelal aşkıma be, kazandın!`;
    // Art arda 3 başarılı testten sonra seviye atla
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

  // Tekrar başlatmak için start butonunu göster
  document.getElementById('start-btn').style.display = 'inline-block';
}

/*************************************
 * SEVİYE VE İLERLEMEYİ GÜNCELLE
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
 * DOĞRU / YANLIŞ SAYACINI GÜNCELLE
 *************************************/
function updateScoreTracker() {
  document.getElementById('score-tracker').innerText = `Doğru: ${correctAnswers} | Yanlış: ${wrongAnswers}`;
}

/*************************************
 * YEREL KAYIT
 *************************************/
function saveProgress() {
  localStorage.setItem('currentLevel', currentLevel.toString());
  localStorage.setItem('consecutiveSuccesses', consecutiveSuccesses.toString());
}

/*************************************
 * YARDIMCI FONKSİYONLAR
 *************************************/
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getDistractors(correctAnswer) {
  let possible = vocabData
    .map(item => item.turkish)
    .filter(tur => tur.toLowerCase() !== correctAnswer.toLowerCase());
  shuffleArray(possible);
  return possible.slice(0, 2);
}
