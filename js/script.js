// --- Variáveis Globais ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

// ⬅️ VARIÁVEIS DE INTERFACE
const dashboardButton = document.getElementById('dashboardButton');
const loginPanel = document.getElementById('loginPanel');
const usernameInput = document.getElementById('usernameInput');
const loginButton = document.getElementById('loginButton');

let gameLoop;
let isGameRunning = false;
let isPaused = false; // ⏸️ NOVO: Variável de Pausa

// --- Configurações do Power-up ⚡ ---
let starsCollectedForPowerup = 0;
let shotsAvailable = 0;
const SHOTS_MAX = 2;
const STARS_FOR_SHOT = 5;

// --- CONFIGURAÇÕES DO LOCALSTORAGE 💾 ---
const LOCAL_STORAGE_KEY_SCORES = 'space_shooter_all_scores';
let playerScores = {}; 

// Variáveis de Estado de Login e Recorde Global
let playerUsername = null; 
let globalRecordScore = 0; 
let recordFeedbackTimer = 0; // 🏅 Variável para feedback visual de recorde
let cameraShakeTimer = 0; // 💥 NOVO: Variável para controlar o tremor da tela
// --- FIM CONFIGURAÇÕES DO LOCALSTORAGE ---


// --- CARREGAMENTO DE SONS ---
const hitSound = new Audio('public/sound/Colisao.mp3');
const starSound = new Audio('public/sound/Estrela-Coletada.mp3');
const deathSound = new Audio('public/sound/Morte.mp3');
const laserSound = new Audio('public/sound/Laser.mp3');

// CORREÇÃO DE PERFORMANCE: Clona o áudio para tocar o som de forma rápida
function playSound(audioElement) {
    if (audioElement) {
        const audioClone = audioElement.cloneNode();
        audioClone.currentTime = 0;
        audioClone.play().catch(e => console.log("Erro ao tocar som:", e));
    }
}
// --- FIM DO CARREGAMENTO DE SONS ---


// --- CARREGAMENTO DE IMAGENS ---
const playerImg = new Image();
playerImg.src = 'public/textures/Nave.png';
const meteorImg = new Image();
meteorImg.src = 'public/textures/Meteoro.png';
const starImg = new Image();
starImg.src = 'public/textures/Estrela.png';

let assetsLoaded = false;
let imagesToLoad = 3;
let imagesLoaded = 0;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === imagesToLoad) {
        assetsLoaded = true;
        startButton.textContent = 'Iniciar Jogo';
        loginButton.textContent = 'Entrar e Jogar'; 
        console.log("Assets carregados com sucesso!");
    }
}

playerImg.onload = imageLoaded;
meteorImg.onload = imageLoaded;
starImg.onload = imageLoaded;
// --- FIM DO CARREGAMENTO DE IMAGENS ---

// --- Configurações do Jogo ---
let score = 0;
let lives = 5;
const difficulty = 0.01;
const PLAYER_SIZE = 70;
const PLAYER_SPEED = 5;

// --- Objeto do Jogador ---
let player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 50,
    dx: 0,
    dy: 0
};

// --- Arrays de Objetos ---
let meteors = [];
let stars = [];
let boosters = [];
let backgroundStars = [];
let shineParticles = [];
let lasers = [];
let explosionParticles = [];


// Inicializa as estrelas de fundo
function initializeBackgroundStars(count) {
    backgroundStars = []; 
    for (let i = 0; i < count; i++) {
        backgroundStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.5
        });
    }
}

// 💾 FUNÇÃO: Lê as pontuações salvas e calcula o recorde global
function loadScores() {
    const savedScores = localStorage.getItem(LOCAL_STORAGE_KEY_SCORES);
    if (savedScores) {
        playerScores = JSON.parse(savedScores);
    } else {
        playerScores = {};
    }

    globalRecordScore = 0;
    if (Object.keys(playerScores).length > 0) {
        globalRecordScore = Math.max(...Object.values(playerScores));
    }
}

// 💾 FUNÇÃO: Atualiza e salva as pontuações no localStorage
function saveScores(currentScore) {
    if (!playerUsername) return { newBest: false, newGlobal: false }; 

    let newBest = false;
    let newGlobal = false;

    // Recorde Pessoal
    const currentBest = playerScores[playerUsername] || 0;
    if (currentScore > currentBest) {
        playerScores[playerUsername] = currentScore;
        localStorage.setItem(LOCAL_STORAGE_KEY_SCORES, JSON.stringify(playerScores));
        newBest = true;
    }

    // Recorde Global
    if (currentScore > globalRecordScore) {
        globalRecordScore = currentScore; 
        newGlobal = true;
    }

    return { newBest, newGlobal };
}

// 📊 FUNÇÃO para exibir o Dashboard
function showDashboard() {
    loadScores(); 

    let playerBest = playerScores[playerUsername] || 0;
    
    // Constrói a lista dos 5 melhores
    const sortedScores = Object.entries(playerScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); 

    let globalList = '';
    sortedScores.forEach(([name, score], index) => {
        const highlightClass = name === playerUsername ? 'style="color: #00ffff; font-weight: bold;"' : '';
        globalList += `<li ${highlightClass}>#${index + 1}: ${name} - ${score} pts</li>`;
    });

    // Exibe o painel
    overlay.querySelector('h1').textContent = `Painel de Recordes de ${playerUsername}`;
    overlay.querySelector('p').innerHTML = `
        <h3>🏆 Recorde Global: ${globalRecordScore} pontos</h3>
        <p>Seu Melhor Placar: ${playerBest} pontos.</p>
        
        <h4>Top 5 Placar Global:</h4>
        <ol>${globalList}</ol>
    `;
    overlay.querySelector('#startButton').textContent = 'Continuar Jogando';
    
    loginPanel.classList.remove('active');
    overlay.classList.add('active');
}


window.onload = () => {
    initializeBackgroundStars(150);
    loadScores();
    
    // 1. Esconde a sobreposição do jogo e mostra a de login por padrão
    overlay.classList.remove('active');
    loginPanel.classList.add('active');
    
    // Esconde o botão do dashboard até o login
    dashboardButton.style.display = 'none';
    
    // ⌨️ INJETA INFORMAÇÕES DE CONTROLE (Corrigido para não quebrar event listeners)
    const controlsHtml = `
        <div id="controlsInfo" style="margin-top: 20px; padding: 10px; border: 1px solid #00ffff; background-color: rgba(0, 0, 0, 0.5);">
            <p style="font-size: 1.1em; color: #00ffff; font-weight: bold; margin: 0 0 5px 0;">CONTROLES</p>
            <ul style="text-align: left; list-style: none; padding-left: 0; margin: 0; color: #ffffff;">
                <li>Use ➡️⬅️⬆️⬇️ ou W A S D para: Mover Nave</li>
                <li>Aperte E ou Espaço para: Atirar Laser</li>
                <li>Aperte P para: Pausar Jogo</li>
                <li>Use o mouse para: Mover Horizontalmente</li>
            </ul>
        </div>
    `;
    
    loginPanel.insertAdjacentHTML('beforeend', controlsHtml);
};


/** Desenha o raio laser estilizado com gradiente */
function drawLaser(laser) {
    const gradient = ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.height);
    
    gradient.addColorStop(0, '#ffffff'); 
    gradient.addColorStop(0.3, laser.color); 
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0.5)'); 

    // 2. Adiciona um "Glow" (brilho externo) 
    ctx.shadowBlur = 10;
    ctx.shadowColor = laser.color;
    
    // 3. Desenha o corpo principal do laser
    ctx.fillStyle = gradient;
    ctx.fillRect(laser.x - laser.width / 2, laser.y, laser.width, laser.height);
    
    // 4. Desenha uma camada mais fina para intensificar o centro
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(laser.x - 1, laser.y, 2, laser.height);

    // 5. Reseta as sombras
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}


// Desenha e Atualiza as estrelas de fundo
function drawBackground() {
    ctx.fillStyle = '#FFFFFF'; 
    backgroundStars.forEach(star => {
        star.y += star.speed;
        
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }

        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

// Gera partículas de brilho (explosão) ao coletar uma estrela
function generateShineParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1; 
        shineParticles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            life: 30, 
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: '#ffffaa' 
        });
    }
}

/** Gera partículas de explosão quando um meteoro é destruído */
function generateExplosionParticles(x, y, color = '#ff8800') { 
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3; 
        const size = Math.random() * 5 + 1;
        
        explosionParticles.push({
            x: x,
            y: y,
            size: size,
            life: 60, 
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: color
        });
    }
}

// Gera novas partículas de propulsão
function generateBoosters() {
    const centerX = player.x + PLAYER_SIZE / 2;
    const baseY = player.y + PLAYER_SIZE * 0.4; 
    
    for (let i = 0; i < 4; i++) {
        boosters.push({
            x: centerX + (Math.random() - 0.5) * PLAYER_SIZE * 0.3, 
            y: baseY,
            size: Math.random() * 4 + 1, 
            life: 45, 
            speedY: Math.random() * 3 + 2, 
            color: Math.random() < 0.7 ? '#ff4400' : '#ffff00' 
        });
    }
}

/** Desenha a Nave do Jogador usando PNG */
function drawPlayer() {
    if (assetsLoaded) {
        ctx.drawImage(playerImg, player.x, player.y - PLAYER_SIZE * 0.5, PLAYER_SIZE, PLAYER_SIZE);
    } else {
        ctx.fillStyle = '#00ffff'; 
        ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }
}

/** Desenha um Meteor (Objeto Inimigo) usando PNG e adiciona efeito Neon */
function drawMeteor(meteor) {
    const size = meteor.radius * 2;
    
    // 🌟 APLICA O EFEITO GLOW 
    ctx.shadowBlur = 10; 
    ctx.shadowColor = '#ff4400'; // Cor do brilho (Laranja Neon)
    
    if (assetsLoaded) {
        ctx.drawImage(meteorImg, meteor.x - meteor.radius, meteor.y - meteor.radius, size, size);
    } else {
        // Fallback (Mantido)
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, meteor.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 💡 IMPORTANTE: RESETA O GLOW após desenhar o meteoro
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

/** Desenha uma Star (Objeto Coletável) usando PNG e adiciona efeito Neon */
function drawStar(star) {
    const size = star.radius * 2;

    // 🌟 APLICA O EFEITO GLOW
    ctx.shadowBlur = 15; 
    ctx.shadowColor = '#ffff00'; // Cor do brilho (Amarelo Neon)
    
    if (assetsLoaded) {
        ctx.drawImage(starImg, star.x - star.radius, star.y - star.radius, size, size);
    } else {
        // Fallback (Mantido)
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); 
        ctx.fill();
    }
    
    // 💡 IMPORTANTE: RESETA O GLOW após desenhar a estrela
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

/** Atualiza a posição dos objetos e verifica colisões */
function updateObjects() {
    
    // GERAÇÃO E ATUALIZAÇÃO DOS BOOSTERS
    generateBoosters(); 
    boosters = boosters.filter(booster => {
        booster.y += booster.speedY; 
        booster.life--;             
        return booster.life > 0;
    });

    // --- Atualiza a Posição dos Lasers ---
    lasers = lasers.filter(laser => {
        laser.y -= laser.speed;
        return laser.y > -laser.height; 
    });

    // 1. Atualiza e checa Meteors (e colisão com lasers)
    meteors = meteors.filter(meteor => {
        meteor.y += meteor.speed;
        let isDestroyed = false; 

        // Checa Colisão com Laser
        lasers = lasers.filter(laser => {
            const laserHitboxX = laser.x - laser.width / 2;
            
            if (!isDestroyed && 
                meteor.x - meteor.radius < laserHitboxX + laser.width &&
                meteor.x + meteor.radius > laserHitboxX &&
                meteor.y - meteor.radius < laser.y + laser.height &&
                meteor.y + meteor.radius > laser.y) 
            {
                isDestroyed = true; 
                return false; // Remove o laser
            }
            return true; // Mantém o laser
        });

        if (isDestroyed) {
            generateExplosionParticles(meteor.x, meteor.y, '#ff4400');
            score += 5; 
            scoreDisplay.textContent = 'Pontos: ' + score;
            return false; // Remove o meteor
        }

        // Colisão com o jogador
        let playerCenterX = player.x + PLAYER_SIZE / 2;
        let playerCenterY = player.y + PLAYER_SIZE / 2;
        
        let distance = Math.sqrt(Math.pow(playerCenterX - meteor.x, 2) + Math.pow(playerCenterY - meteor.y, 2));
        
        if (distance < PLAYER_SIZE / 2 + meteor.radius) {
            playSound(hitSound); 
            handleHit(); 
            return false; 
        }

        // Se sair da tela, remove
        return meteor.y < canvas.height + meteor.radius;
    });

    // 2. Atualiza e checa Stars
    stars = stars.filter(star => {
        star.y += star.speed;

        // Colisão com o jogador
        let playerCenterX = player.x + PLAYER_SIZE / 2;
        let playerCenterY = player.y + PLAYER_SIZE / 2;

        let distance = Math.sqrt(Math.pow(playerCenterX - star.x, 2) + Math.pow(playerCenterY - star.y, 2));
        
        if (distance < PLAYER_SIZE / 2 + star.radius) {
            playSound(starSound); 
            generateShineParticles(star.x, star.y); 

            // Lógica do Power-up
            starsCollectedForPowerup++;
            if (starsCollectedForPowerup >= STARS_FOR_SHOT) {
                if (shotsAvailable < SHOTS_MAX) {
                    shotsAvailable = SHOTS_MAX; 
                }
                starsCollectedForPowerup = 0; 
            }

            score += 10;
            scoreDisplay.textContent = 'Pontos: ' + score;
            return false; 
        }

        // Se sair da tela, remove
        return star.y < canvas.height + star.radius;
    });
    
    // ATUALIZA AS PARTÍCULAS DE BRILHO
    shineParticles = shineParticles.filter(particle => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        particle.dx *= 0.95;
        particle.dy *= 0.95; 

        return particle.life > 0;
    });

    // ATUALIZA AS PARTÍCULAS DE EXPLOSÃO
    explosionParticles = explosionParticles.filter(particle => {
        particle.dx *= 0.96; 
        particle.dy *= 0.96;
        
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        return particle.life > 0;
    });
}

/** Lida com o jogador sendo atingido */
function handleHit() {
    lives--;
    livesDisplay.textContent = 'Vidas: ' + lives;

    // Zera o power-up na colisão
    starsCollectedForPowerup = 0;
    shotsAvailable = 0;
    lasers = [];

    // Pisca a tela para feedback
    canvas.style.opacity = 0.5;
    setTimeout(() => canvas.style.opacity = 1, 100);

    if (lives <= 0) {
        playSound(deathSound); 
        
        // 💥 NOVO: Grande explosão no centro da nave ao morrer
        generateExplosionParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, '#ffffff');
        
        // 💥 NOVO: Ativa o efeito Camera Shake (20 frames = ~333ms)
        cameraShakeTimer = 20; 
        
        endGame();
    }
}

/** Função principal de Loop do Jogo */
function gameLoopFunction() {
    if (!isGameRunning) return;
    
    // ⏸️ Lógica de Pausa
    if (isPaused) {
        // Desenha a mensagem de Pausa
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff00ff';
        ctx.font = '40px Arial';
        ctx.fillText('JOGO PAUSADO', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#00ffff';
        ctx.font = '20px Arial';
        ctx.fillText('Pressione P para Continuar', canvas.width / 2, canvas.height / 2 + 20);
        
        gameLoop = requestAnimationFrame(gameLoopFunction);
        return; 
    }
    
    // 🏅 Gerencia o feedback visual
    if (recordFeedbackTimer > 0) {
        recordFeedbackTimer--;
    }
    
    // 💥 NOVO: Lógica do Camera Shake
    let shakeX = 0;
    let shakeY = 0;

    if (cameraShakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 5; // Desloca entre -2.5 e 2.5 pixels
        shakeY = (Math.random() - 0.5) * 5;
        cameraShakeTimer--;
    }

    // 1. Limpa o Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 💥 NOVO: Salva e aplica o deslocamento para o Camera Shake
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();

    // 2. Atualiza Posições
    // Player movement update (manual)
    player.x += player.dx * PLAYER_SPEED;
    player.y += player.dy * PLAYER_SPEED;
    if (player.x < 0) player.x = 0;
    if (player.x + PLAYER_SIZE > canvas.width) player.x = canvas.width - PLAYER_SIZE;
    if (player.y < 0) player.y = 0;
    if (player.y + PLAYER_SIZE > canvas.height) player.y = canvas.height - PLAYER_SIZE;
    
    spawnObjects();
    updateObjects();

    // 3. Desenha Objetos
    // Desenha Lasers
    lasers.forEach(drawLaser); 

    meteors.forEach(drawMeteor);
    stars.forEach(drawStar);

    // Desenha as partículas de brilho (estrela)
    shineParticles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30; 
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });

    // Desenha as partículas de EXPLOSÃO (meteoro)
    explosionParticles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 60; 
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    
    // Desenha as partículas de propulsão
    boosters.forEach(booster => {
        ctx.fillStyle = booster.color;
        ctx.globalAlpha = booster.life / 45; 
        ctx.fillRect(booster.x, booster.y, booster.size, booster.size);
    });
    
    ctx.globalAlpha = 1.0; 
    
    drawPlayer(); 
    
    // Indicador de Tiros (Texto)
    ctx.fillStyle = shotsAvailable > 0 ? '#00ff00' : '#ff0000'; 
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    const powerUpText = shotsAvailable > 0 ? `Tiros: ${shotsAvailable}` : `Tiros: ${starsCollectedForPowerup}/${STARS_FOR_SHOT}`;
    ctx.fillText(powerUpText, canvas.width - 10, 20); 
    
    // 🚀 BARRA DE PROGRESSO DO POWER-UP
    const barWidth = 100;
    const barHeight = 8;
    const barX = canvas.width - barWidth - 10;
    const barY = 30;
    const progress = starsCollectedForPowerup / STARS_FOR_SHOT;

    // Fundo da barra
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progresso
    ctx.fillStyle = shotsAvailable > 0 ? '#00ff00' : '#ff00ff'; 
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Borda Neon
    ctx.strokeStyle = shotsAvailable > 0 ? '#00ffff' : '#ff00ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // 💾 Indicadores de Recorde Global
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffcc00'; 
    ctx.fillText(`Global: ${globalRecordScore}`, 10, 20); 

    // 🏅 Placar Pessoal com Feedback de Recorde (Piscando)
    const feedbackActive = recordFeedbackTimer > 0 && (recordFeedbackTimer % 10 < 5);
    
    ctx.fillStyle = feedbackActive ? '#ff00ff' : '#00ffff'; 
    ctx.fillText(`Jogador: ${playerUsername || 'Não Logado'}`, 10, 40); 
    
    // 💥 NOVO: Restaura o contexto para remover o deslocamento
    ctx.restore(); 

    // 4. Repete o Loop
    gameLoop = requestAnimationFrame(gameLoopFunction);
}

/** Inicia o jogo */
function startGame() {
    if (!assetsLoaded) return; 
    
    // Zera o estado de pausa e power-up
    isPaused = false;
    starsCollectedForPowerup = 0; 
    shotsAvailable = 0; 
    
    score = 0;
    lives = 5; 
    player.x = canvas.width / 2 - PLAYER_SIZE / 2;
    player.y = canvas.height - 50;
    meteors = [];
    stars = [];
    boosters = []; 
    shineParticles = []; 
    lasers = []; 
    explosionParticles = []; 
    initializeBackgroundStars(150); 
    
    cameraShakeTimer = 0; // Garante que não haja tremor no início
    
    scoreDisplay.textContent = 'Pontos: 0';
    livesDisplay.textContent = 'Vidas: 5'; 

    overlay.classList.remove('active');
    isGameRunning = true;
    gameLoopFunction(); 
}

/** Finaliza o jogo */
function endGame() {
    isGameRunning = false;
    cancelAnimationFrame(gameLoop);
    
    const finalScore = score;
    const { newBest, newGlobal } = saveScores(finalScore); 

    let message = `Sua pontuação final foi: ${finalScore} pontos.`;
    if (newGlobal) {
        message = `🏆 NOVO RECORD GLOBAL! 🏆 Sua pontuação: ${finalScore}`;
    } else if (newBest) {
        message = `🏅 NOVO RECORD PESSOAL! 🏅 Sua pontuação: ${finalScore}`;
    }
    
    // 🏅 Ativa o feedback visual do recorde por 3 segundos
    if (newBest || newGlobal) {
        recordFeedbackTimer = 180; 
    }

    // Certifica-se de que o DashboardButton está visível ao final do jogo
    if (playerUsername) {
        dashboardButton.style.display = 'block';
    }

    overlay.querySelector('h1').textContent = 'FIM DE JOGO!';
    overlay.querySelector('p').innerHTML = message; 
    overlay.querySelector('#startButton').textContent = 'Jogar Novamente';
    overlay.classList.add('active');
}

/** Gera um novo Meteor ou Star aleatoriamente */
function spawnObjects() {
    if (Math.random() < 0.01 + difficulty) {
        meteors.push({
            x: Math.random() * canvas.width,
            y: -20, 
            radius: Math.random() * 35 + 10, 
            speed: Math.random() * 1 + 1 
        });
    }

    if (Math.random() < 0.01 + difficulty / 2) {
        stars.push({
            x: Math.random() * canvas.width,
            y: -20,
            radius: 20,
            speed: Math.random() * 1.5 + 0.5
        });
    }
}


// --- Controles de Entrada ---

document.addEventListener('keydown', (e) => {
    
    // ⏸️ Tecla de Pausa
    if (e.key === 'p' || e.key === 'P' || e.key === 'Pausa') {
        if (isGameRunning) {
            isPaused = !isPaused; 
            return;
        }
    }

    if (!isGameRunning || isPaused) return; 
    
    // Controles de movimento
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.dx = 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.dx = -1;
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        player.dy = -1;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        player.dy = 1;
    }
    
    // Tiro de Laser (Espaço ou E) 🎯 
    if (e.key === ' ' || e.key === 'e') {
        if (isGameRunning && shotsAvailable > 0) {
            
            hitSound.pause();
            deathSound.pause(); 
            
            playSound(laserSound); 
            shotsAvailable--;
            
            // 🔫 IMPLEMENTAÇÃO DO TIRO DUPLO (3B)
            const laserBase = {
                y: player.y - PLAYER_SIZE * 0.5, 
                width: 10, 
                height: 80, 
                speed: 8, 
                color: '#ff00ff' 
            };
            
            // Laser da Esquerda
            lasers.push({
                x: player.x + PLAYER_SIZE / 2 - 15, // Desloca 15px para a esquerda
                ...laserBase 
            });
            
            // Laser da Direita
            lasers.push({
                x: player.x + PLAYER_SIZE / 2 + 15, // Desloca 15px para a direita
                ...laserBase
            });
            // ---------------------------------
        }
    }
});

document.addEventListener('keyup', (e) => {
    // Parar apenas se a tecla solta for a que estava em uso
    if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && player.dx > 0) {
        player.dx = 0;
    } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && player.dx < 0) {
        player.dx = 0;
    } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && player.dy < 0) {
        player.dy = 0;
    } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && player.dy > 0) {
        player.dy = 0;
    }
});

// Controle por Mouse
canvas.addEventListener('mousemove', (e) => {
    if (!isGameRunning || isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    player.x = mouseX - PLAYER_SIZE / 2;
});

// --- Inicialização e Event Listeners ---

// 1. Inicia o jogo a partir da tela de JOGAR NOVAMENTE
startButton.addEventListener('click', startGame);

// 2. 🔑 Lógica do botão de Login
loginButton.addEventListener('click', () => {
    let username = usernameInput.value.trim();

    if (!assetsLoaded) {
        alert("Aguarde o carregamento dos assets.");
        return;
    }
    if (username.length > 10 || username.length < 2) {
        alert("O nome deve ter entre 2 e 10 caracteres.");
        return;
    }

    playerUsername = username;
    loginPanel.classList.remove('active'); 
    dashboardButton.style.display = 'block'; 
    
    loadScores(); 
    
    startGame(); 
});

// 3. 📊 Lógica do botão do Dashboard
dashboardButton.addEventListener('click', showDashboard);

// Estado inicial 
overlay.classList.add('active');
startButton.textContent = 'Carregando Imagens...';

loginButton.textContent = 'Carregando Imagens...';
