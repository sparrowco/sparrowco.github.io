const COOLDOWN_DEATH = 30 * 1000;
const COOLDOWN_KNOCKOUT = 10 * 1000;
const KEY_STATE = 'gameState_FW';
const KEY_TIME = 'gameTimestamp_FW';
const KEY_USERS = 'users_FW';
const KEY_ACTIVE_USER = 'activeUser_FW';

let playerName = "Cadetto";
let currentSlideIndex = 0;
let timerInterval;
let lastScreenBeforeCodex = 'intro-screen';

/* ---------- Gestione Account & Codex ---------- */

const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

function getUsers() {
    const raw = store.get(KEY_USERS);
    return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
    store.set(KEY_USERS, JSON.stringify(users));
}

function getActiveUser() {
    return store.get(KEY_ACTIVE_USER);
}

function updateAuthUI() {
    const active = getActiveUser();
    const userBtnLabel = document.getElementById('user-btn-label');
    const codexBtn = document.getElementById('codex-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const dragonsCount = document.getElementById('dragons-count');
    const nameInput = document.getElementById('player-name');

    if (active) {
        const users = getUsers();
        const user = users[active] || { dragons: [] };
        userBtnLabel.innerText = active;
        codexBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        dragonsCount.innerText = (user.dragons || []).length;
        if (nameInput) nameInput.value = active;
        playerName = active;
    } else {
        userBtnLabel.innerText = "Accedi";
        codexBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
}

function openAuthModal() {
    document.getElementById('auth-msg').innerText = '';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function submitAuth() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const msg = document.getElementById('auth-msg');

    if (!username || !password) {
        msg.innerText = "Inserisci nome e chiave.";
        return;
    }

    const users = getUsers();
    if (users[username]) {
        if (users[username].password === password) {
            store.set(KEY_ACTIVE_USER, username);
            closeAuthModal();
            updateAuthUI();
        } else {
            msg.innerText = "Chiave segreta errata per questo cadetto.";
        }
    } else {
        users[username] = {
            password: password,
            dragons: [],
            createdAt: new Date().toLocaleDateString('it-IT')
        };
        saveUsers(users);
        store.set(KEY_ACTIVE_USER, username);
        closeAuthModal();
        updateAuthUI();
    }
}

function logoutCadet() {
    store.remove(KEY_ACTIVE_USER);
    document.getElementById('player-name').value = '';
    playerName = "Cadetto";
    updateAuthUI();
}

function saveBondedDragon(dragonObj) {
    const active = getActiveUser();
    if (!active) return;
    const users = getUsers();
    if (!users[active]) users[active] = { password: '', dragons: [] };
    if (!users[active].dragons) users[active].dragons = [];

    users[active].dragons.unshift({
        name: dragonObj.name,
        color: dragonObj.color,
        tail: dragonObj.tail,
        traits: dragonObj.traits,
        age: dragonObj.age,
        gender: dragonObj.gender,
        date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    saveUsers(users);
    updateAuthUI();
}

function openCodex() {
    const active = getActiveUser();
    const codexScreen = document.getElementById('codex-screen');
    const cadetNameEl = document.getElementById('codex-cadet-name');
    const listEl = document.getElementById('codex-list');

    // Trova lo schermo attualmente visibile per tornarci dopo
    ['intro-screen', 'slideshow-screen', 'story-screen', 'result-screen', 'cooldown-screen', 'empty-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden') && el.style.opacity !== '0') {
            lastScreenBeforeCodex = id;
            el.classList.add('hidden');
        }
    });

    cadetNameEl.innerText = active ? `Registro del Cadetto: ${active.toUpperCase()}` : "Registro Ospite (Nessun account attivo)";
    listEl.innerHTML = '';

    const users = getUsers();
    const dragons = (active && users[active] && users[active].dragons) ? users[active].dragons : [];

    if (dragons.length === 0) {
        listEl.innerHTML = `<p style="color: #8c827a; font-style: italic;">Nessun legame ancora registrato. Affronta la Trebbiatura per scoprire il tuo primo drago.</p>`;
    } else {
        dragons.forEach(d => {
            const card = document.createElement('div');
            card.className = 'codex-card';
            card.innerHTML = `
                <div class="codex-card-header">
                    <span class="codex-dragon-name">${d.name} (${d.color})</span>
                    <span class="codex-date">${d.date}</span>
                </div>
                <p class="codex-dragon-details">
                    <strong>Sesso:</strong> ${d.gender} | <strong>Età:</strong> ${d.age}<br>
                    <strong>Coda:</strong> ${d.tail}<br>
                    <strong>Tratti:</strong> ${d.traits}
                </p>
            `;
            listEl.appendChild(card);
        });
    }

    codexScreen.classList.remove('hidden');
    setTimeout(() => { codexScreen.style.opacity = '1'; }, 50);
}

function closeCodex() {
    const codexScreen = document.getElementById('codex-screen');
    codexScreen.style.opacity = '0';
    setTimeout(() => {
        codexScreen.classList.add('hidden');
        const prev = document.getElementById(lastScreenBeforeCodex) || document.getElementById('intro-screen');
        prev.classList.remove('hidden');
        setTimeout(() => { prev.style.opacity = '1'; }, 50);
    }, 400);
}

/* ---------- Effetto Parallasse Sfondo ---------- */

let bgMoveTicking = false;

function handleBackgroundMovement(clientX, clientY) {
    if (bgMoveTicking) return;
    bgMoveTicking = true;
    requestAnimationFrame(() => {
        const xFactor = (clientX / window.innerWidth) - 0.5;
        const yFactor = (clientY / window.innerHeight) - 0.5;
        const maxOffset = 22;
        const moveX = (xFactor * maxOffset).toFixed(1);
        const moveY = (yFactor * maxOffset).toFixed(1);

        document.documentElement.style.setProperty('--bg-x', `${moveX}px`);
        document.documentElement.style.setProperty('--bg-y', `${moveY}px`);
        bgMoveTicking = false;
    });
}

window.addEventListener('pointermove', e => handleBackgroundMovement(e.clientX, e.clientY), { passive: true });
window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) handleBackgroundMovement(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

/* ---------- Gestione Audio ---------- */

let isAudioPlaying = false;

function toggleAudio() {
    const audio = document.getElementById('bg-audio');
    const btn = document.getElementById('audio-toggle-btn');
    if (audio.paused) {
        audio.play().then(() => {
            isAudioPlaying = true;
            btn.innerHTML = "🔊";
        }).catch(e => console.log("Riproduzione audio bloccata:", e));
    } else {
        audio.pause();
        isAudioPlaying = false;
        btn.innerHTML = "🔇";
    }
}

function changeVolume(val) {
    const audio = document.getElementById('bg-audio');
    audio.volume = val;
    const btn = document.getElementById('audio-toggle-btn');
    btn.innerHTML = (val == 0) ? "🔇" : "🔊";
}

document.addEventListener('pointerdown', () => {
    const audio = document.getElementById('bg-audio');
    if (!isAudioPlaying && audio && audio.paused) {
        audio.volume = document.getElementById('volume-slider').value;
        audio.play().then(() => {
            isAudioPlaying = true;
            document.getElementById('audio-toggle-btn').innerHTML = "🔊";
        }).catch(e => {});
    }
}, { once: true });

/* ---------- Utility ---------- */

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

['lobby.webp', 'parapetto.jpg', 'la_valle.jpg', 'tyrrendor.jpg', 'terre_desolate.jpg', 'la_palude.jpg', 'bottone.png', 'esterno.png']
    .forEach(n => { new Image().src = 'images/' + n; });

let lastClick = 0;
document.addEventListener('click', e => {
    if (!e.target.closest('.choice-btn')) return;
    const now = Date.now();
    if (now - lastClick < 800) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    lastClick = now;
}, true);

/* ---------- Contenuti Intro ---------- */

const storySlides = [
    "Hai superato il Parapetto, {nome}. Molti dei tuoi compagni sono precipitati nell'abisso.",
    "L'odore di zolfo brucia nei polmoni. Oggi è il Giorno della Trebbiatura.",
    "I draghi non cercano pedine da salvare: cercano guerrieri da forgiare o deboli da incenerire.",
    "Un drago senza il suo cavaliere è una tragedia. Un cavaliere senza il suo drago è morto.",
    "Davanti a te il continente si apre, disseminato di trappole, nemici spietati e creature arcaiche.",
    "Cammina con cautela. Ogni respiro potrebbe essere l'ultimo."
];

/* ---------- Albero Narrativo Complesso ---------- */

const storyNodes = {
    start: {
        text: "Ti trovi all'uscita delle mura della fortezza di Basgiath. Cinque sentieri conducono alle regioni dove i draghi si radunano. Quale via intraprendi, {nome}?",
        bg: "bg-parapetto",
        choices: [
            { text: "Mi intrufolo nella Valle (The Vale), territorio sacro delle nidiate.", target: "val_approccio" },
            { text: "Scalo i picchi sferzati dal vento di Tyrrendor.", target: "tyr_base" },
            { text: "Esploro le pianure rocciose verso il confine di Poromiel.", target: "por_base" },
            { text: "Discendo verso le desolate forre vulcaniche.", target: "des_base" },
            { text: "Seguo il mormorio dei fiumi verso l'arcipelago antico.", target: "iso_base" }
        ]
    },

    val_approccio: {
        bg: "bg-valle",
        text: "La Valle è immersa in una foschia umida. Agli umani è vietato disturbare le nidiate. Più avanti scorgi le torce di una ronda di istruttori.",
        choices: [
            { text: "Scalo silenziosamente la ripida parete rocciosa a ovest.", target: "val_parete" },
            { text: "Attendo nell'ombra che la ronda passi prima di avanzare.", target: "val_sentiero_basso" },
            { text: "Tento di superare gli istruttori correndo a perdifiato.", target: "val_ko_ronda" }
        ]
    },
    val_ko_ronda: {
        text: "Svenimento: Intercettato. Un istruttore esperto ti scaglia contro un dardo stordente da dietro le rocce. Ti risvegli in infermeria per insubordinazione.",
        knockout: true
    },
    val_sentiero_basso: {
        text: "La ronda si allontana. Prosegui tra le felci umide, ma inciampi su una trappola a scatto lasciata dai sentieri di guardia.",
        choices: [
            { text: "Trattengo il grido e taglio la fune con il pugnale.", target: "val_parete" },
            { text: "Mi divincolo con forza facendo risuonare i rami.", target: "val_ko_ronda" }
        ]
    },
    val_parete: {
        bg: "bg-valle",
        text: "Raggiungi un terrazzo naturale sopraelevato. Tra i cespugli di felce dorata noti qualcosa che si muove: è un piccolo cucciolo di drago dalle scaglie brillanti.",
        choices: [
            { text: "Provo ad accarezzarlo dolcemente sulla testa.", target: "val_cucciolo_accarezza" },
            { text: "Indietreggio silenziosamente per non far rumore e scappare.", target: "val_cucciolo_fuga" },
            { text: "Non lo tocco e scruto l'area circostante per cercare la madre.", target: "val_cucciolo_cerca_madre" }
        ]
    },
    val_cucciolo_accarezza: {
        text: "Morte: Madre Protettiva. I cuccioli non si toccano mai. Un immenso Drago Verde piomba dal cielo a fauci spalancate. Vieni incenerito all'istante.",
        death: true
    },
    val_cucciolo_cerca_madre: {
        bg: "bg-valle",
        text: "Alzi lo sguardo: tra gli alberi scricchiolanti atterra la madre, un maestoso Drago Verde con una letale Coda a Spada. Ti fissa con occhi dorati e minacciosi.",
        choices: [
            { text: "Ginocchio a terra: abbasso la testa ed espongo la gola in totale sottomissione.", target: "val_madre_sottomesso" },
            { text: "Resto saldo in piedi a mani aperte, senza paura né intenzioni ostili.", target: "val_madre_rispetto" },
            { text: "Estraggo il pugnale preparandomi a difendermi.", target: "val_madre_attacco" }
        ]
    },
    val_madre_attacco: {
        text: "Morte: Follia da Cadetto. Nessun umano può sfidare un drago adulto a terra con una lama. Vieni ridotto in cenere in un battito di ciglia.",
        death: true
    },
    val_madre_sottomesso: {
        text: "Il Drago Verde disprezza i codardi. Con un colpo d'ala possente ti scaglia sul fondo di una profonda gola d'ombra.",
        choices: [
            { text: "Mi rialzo dolorante e mi inoltro nel canyon buio.", target: "val_canyon_nero_1" }
        ]
    },
    val_madre_rispetto: {
        text: "Il Drago Verde apprezza la tua mente fredda e il rispetto dimostrato verso la nidiata. Abbassa il muso massiccio verso di te, sondando i tuoi pensieri.",
        choices: [
            { text: "Apro la mente alla sua saggezza tattica e militare.", target: "successo_verde" },
            { text: "Tento di chiudere la mente temendo che mi bruci i pensieri.", target: "val_madre_rifiuto" }
        ]
    },
    val_madre_rifiuto: {
        text: "Svenimento: Sovraccarico Mentale. Il drago respinge la tua debolezza mentale con un'onda d'urto che ti fa perdere i sensi.",
        knockout: true
    },

    val_cucciolo_fuga: {
        bg: "bg-valle",
        text: "Ti ritiri a passi felpati, ma svoltando dietro un crinale ti trovi davanti Vane, un cadetto spietato con una spada già sguainata: 'Meno concorrenza al legame', sibila.",
        choices: [
            { text: "Accetto lo scontro ed estraggo il pugnale.", target: "val_cadetto_duello" },
            { text: "Lancio polvere negli occhi e fuggo verso una fessura tra le rocce.", target: "val_cadetto_fuga_bioma" },
            { text: "Cerco di farlo ragionare: 'I draghi sentono l'odore del sangue fratricida.'", target: "val_cadetto_parla" }
        ]
    },
    val_cadetto_parla: {
        text: "Morte: Tradimento. Vane finge di abbassare l'arma ma con un balzo ti trafigge a sangue freddo.",
        death: true
    },
    val_cadetto_fuga_bioma: {
        bg: "bg-desolate",
        text: "Ti infili nella fessura mentre la sua lama sfiora la roccia. Scivoli lungo una ripida colata di ghiaia sulfurea: il paesaggio intorno a te è mutato radicalmente.",
        choices: [
            { text: "Mi rimetto in sesto ed esploro i crepacci fumanti.", target: "des_crepaccio" }
        ]
    },
    val_cadetto_duello: {
        text: "Il cadetto si avventa su di te con un fendente violento dall'alto.",
        choices: [
            { text: "Schivo lateralmente, afferro il suo braccio e affondo la lama.", target: "val_cadetto_ucciso" },
            { text: "Eseguo uno sgambetto atterrandolo e disarmandolo, poi gli punto la lama alla gola.", target: "val_cadetto_risparmiato" },
            { text: "Tento di bloccare la spada direttamente con il mio pugnale.", target: "val_cadetto_parata_morte" }
        ]
    },
    val_cadetto_parata_morte: {
        text: "Morte: Forza Disuguale. La sua spada pesante frantuma il tuo pugnale da cadetto e ti trapassa il petto.",
        death: true
    },
    val_cadetto_ucciso: {
        text: "Vane crolla al suolo. Il sangue caldo attira una presenza immane dai recessi della gola. La terra trema sotto artigli titanici.",
        choices: [
            { text: "Rinfodero l'arma e resto immobile guardando nell'ombra.", target: "val_canyon_nero_1" }
        ]
    },
    val_cadetto_risparmiato: {
        text: "Risparmi Vane: 'Vattene prima che cambi idea'. Dalle alture rocciose scende un massiccio Drago Marrone, colpito dal tuo onore militare.",
        choices: [
            { text: "Mostro le mani vuote e sostengo lo sguardo dell'animale.", target: "val_marrone_test" }
        ]
    },
    val_marrone_test: {
        text: "Il Drago Marrone ruggisce scuotendo le montagne. Cerca un cavaliere d'onore e con una lealtà incrollabile verso lo stormo.",
        choices: [
            { text: "Offro la mia lealtà senza esitazione né secondi fini.", target: "successo_marrone" },
            { text: "Indietreggio intimorito dalle sue dimensioni titaniche.", target: "legame_vuoto" }
        ]
    },

    val_canyon_nero_1: {
        bg: "bg-valle",
        text: "Nel cuore della gola più oscura della Valle, la luce del sole svanisce. Davanti a te si staglia una bestia colossale: un Drago Nero grande il doppio di qualsiasi altro drago.",
        choices: [
            { text: "Abbasso gli occhi e provo a fuggire a ritroso.", target: "val_nero_fuga_morte" },
            { text: "Mi metto in posizione di guardia, senza armi ma fiero.", target: "val_nero_2" }
        ]
    },
    val_nero_fuga_morte: {
        text: "Morte: Istinto Predatorio. Dare le spalle a un Drago Nero fa scattare l'istinto di caccia. Vieni ridotto in polvere prima di fare dieci passi.",
        death: true
    },
    val_nero_2: {
        text: "Il Drago Nero abbassa il muso a pochi centimetri dal tuo petto. Una voce telepatica tonante e antica risuona nella tua mente: 'PERCHÉ DOVREI RISPARMIARTI, UMANO?'",
        choices: [
            { text: "«Non cerco di essere risparmiato. Cerco un potere degno di bruciare i cieli.»", target: "successo_nero" },
            { text: "«Vi prego, nobile drago, ho una famiglia che mi aspetta.»", target: "legame_vuoto" },
            { text: "Urlo in preda al terrore per la pressione mentale.", target: "val_nero_ko" }
        ]
    },
    val_nero_ko: {
        text: "Svenimento: Mente Spezzata. Il potere schiacciante della mente del Drago Nero ti fa sanguinare il naso e perdere conoscenza.",
        knockout: true
    },

    tyr_base: {
        bg: "bg-tyrrendor",
        text: "I picchi rocciosi di Tyrrendor sono scoscesi e battuti da venti gelidi. Due ombre solcano i cieli ad altissima velocità.",
        choices: [
            { text: "Risalgo il costone roccioso verso i nidi sommitali.", target: "tyr_sommita" },
            { text: "Prendo una scorciatoia attraverso una galleria franosa.", target: "tyr_crollo" }
        ]
    },
    tyr_crollo: {
        text: "Morte: Frana Improvvisa. La volta della galleria cede sotto il peso delle rocce. Vieni sepolto vivo.",
        death: true
    },
    tyr_sommita: {
        bg: "bg-tyrrendor",
        text: "Arrivi su un altopiano dove un fiero Drago Blu riposa sull'orlo di un baratro. Poco più in là atterra con violenza un furioso Drago Rosso.",
        choices: [
            { text: "Resto immobile: è una contesa territoriale, non devo interferire.", target: "tyr_duello_draghi" },
            { text: "Lancio pietre al Rosso per supportare il Blu.", target: "tyr_pietra_morte" }
        ]
    },
    tyr_pietra_morte: {
        text: "Morte: Intromissione Letale. Il Drago Rosso devia il capo e ti incenerisce per l'insolenza prima di riprendere il volo.",
        death: true
    },
    tyr_duello_draghi: {
        text: "I due colossi si ringhiano contro. Il Rosso sbatte le ali e atterra vicino al tuo riparo, mentre il Blu ti scruta dall'orlo del baratro.",
        choices: [
            { text: "Avanzo verso il Drago Rosso, mostrando una determinazione feroce e instabile.", target: "tyr_test_rosso" },
            { text: "Cammino saldo verso il Drago Blu, resistendo alla folata di gelo che emana.", target: "tyr_test_blu" }
        ]
    },
    tyr_test_rosso: {
        text: "Il Drago Rosso ti squadra: percepisce la rabbia e l'ambizione brutale dentro di te.",
        choices: [
            { text: "Stringo i pugni e accolgo la sua furia distruttiva.", target: "successo_rosso" },
            { text: "Esito guardando le sue scaglie incandescenti.", target: "legame_vuoto" }
        ]
    },
    tyr_test_blu: {
        text: "Il Drago Blu emana una pressione spietata e glaciale: richiede obbedienza e orgoglio senza macchia.",
        choices: [
            { text: "Apro la mente alla sua spietata freddezza tattica.", target: "successo_blu" },
            { text: "Distolgo lo sguardo non reggendo il suo disprezzo.", target: "legame_vuoto" }
        ]
    },

    des_base: {
        bg: "bg-desolate",
        text: "L'aria sa di zolfo e composti mefitici. Il terreno è grigio. Senti un rumore stridulo di artigli tra le forre.",
        choices: [
            { text: "Mi nascondo dietro una guglia di roccia vulcanica.", target: "des_crepaccio" },
            { text: "Accendo una torcia per esplorare la nebbia.", target: "des_torcia_morte" }
        ]
    },
    des_torcia_morte: {
        text: "Morte: Bersaglio Visibile. La luce attira uno sciame di viverne cieche che ti sbranano nel buio.",
        death: true
    },
    des_crepaccio: {
        bg: "bg-desolate",
        text: "Dalla gola emerge un imprevedibile Drago Arancione, con occhi dorati che brillano di pura pazzia guerriera. Ti circonda con passi pesanti.",
        choices: [
            { text: "Mantengo la calma e adotto una posa da combattimento imprevedibile.", target: "des_arancione_test" },
            { text: "Tento di scappare arrampicandomi sulla parete.", target: "legame_vuoto" }
        ]
    },
    des_arancione_test: {
        text: "Il Drago Arancione ruggisce a un soffio dal tuo viso: apprezza i cavalieri caotici, spietati e pronti a tutto.",
        choices: [
            { text: "Accetto il patto con la sua natura selvaggia e instabile.", target: "successo_arancione" },
            { text: "Chiedo pietà al drago.", target: "legame_vuoto" }
        ]
    },

    iso_base: {
        bg: "bg-isole",
        text: "L'aria è fresca e carica di antica magia. Giungi davanti a una cascata trasparente con sabbia d'oro e ciottoli iridescenti.",
        choices: [
            { text: "Seguo le tracce di ali dorate che conducono dietro il velo d'acqua.", target: "iso_cascata" },
            { text: "Raccolgo un cristallo dal fondo del fiume senza protezioni.", target: "iso_ko_cristallo" }
        ]
    },
    iso_ko_cristallo: {
        text: "Svenimento: Sovraccarico Magico. Il cristallo assorbe la tua forza vitale facendoti svenire sulla riva.",
        knockout: true
    },
    iso_cascata: {
        bg: "bg-isole",
        text: "Oltre la cascata trovi una radura incantata. Una creatura minuscola dalle scaglie cangianti e dorate svolazza curiosa: un raro Drago Codapiuma Iridescente.",
        choices: [
            { text: "Resto immobile a braccia aperte, aspettando con pazienza infinita.", target: "iso_andarna_test" },
            { text: "Faccio un balzo per prenderlo.", target: "legame_vuoto" }
        ]
    },
    iso_andarna_test: {
        text: "Il piccolo drago si posa sulla tua spalla, mimetizzandosi con la tua divisa. Una voce giovanile ma purissima parla al tuo cuore.",
        choices: [
            { text: "Prometto di proteggere il suo segreto fino al giorno della sua maturità.", target: "successo_iridescente" },
            { text: "Le chiedo subito di darmi potere per distruggere i miei nemici.", target: "legame_vuoto" }
        ]
    },

    por_base: {
        bg: "bg-parapetto",
        text: "Verso il confine di Poromiel le sentinelle dei Grifoni pattugliano il cielo. Non ci sono draghi qui, solo pericolo.",
        choices: [
            { text: "Ripiego rapidamente verso la Valle prima di essere avvistato.", target: "val_approccio" },
            { text: "Avanzo a testa bassa in campo aperto.", target: "val_ko_ronda" }
        ]
    },

    successo_nero: {
        text: "La terra trema sotto la potenza dell'ombra. Il Drago Nero abbassa il maestoso capo sigillando un legame devastante nella tua mente.",
        success: true,
        dragonType: "Nero"
    },
    successo_verde: {
        text: "Gli occhi del Drago Verde brillano di saggezza tattica. Un vincolo di disciplina e strategia d'assedio pervade il tuo sangue.",
        success: true,
        dragonType: "Verde"
    },
    successo_blu: {
        text: "Un'energia glaciale e spietata attraversa il tuo petto. Il nobile Drago Blu si china verso di te: il legame è suggellato.",
        success: true,
        dragonType: "Blu"
    },
    successo_rosso: {
        text: "Una vampata di fiamme e furia pura ti avvolge senza bruciarti. Il temibile Drago Rosso accetta la tua natura ardente.",
        success: true,
        dragonType: "Rosso"
    },
    successo_marrone: {
        text: "Un calore saldo e una forza titanica uniscono la tua anima al Drago Marrone. La lealtà del tuo drago non vacillerà mai.",
        success: true,
        dragonType: "Marrone"
    },
    successo_arancione: {
        text: "Un vortice caotico di adrenalina e ferocia esplode nelle tue vene. Il Drago Arancione ha scelto il suo guerriero imprevedibile.",
        success: true,
        dragonType: "Arancione"
    },
    successo_iridescente: {
        text: "Un'aura mitica e dorata risplende attorno a te. Sei legato alla stirpe più rara e misteriosa dell'intero continente.",
        success: true,
        dragonType: "Iridescente"
    },

    legame_vuoto: {
        text: "Hai esitato nel momento decisivo. Il drago si allontana disgustato dalla tua debolezza. Rimarrai un cadetto senza poteri.",
        empty: true
    }
};

/* ---------- Generatore Draghi Coerente ---------- */

function generateDragon(type) {
    let colorName, rarity, traits, tailType, tailRarity, age, name;
    const genders = ["Maschio", "Femmina"];
    const chosenGender = genders[Math.floor(Math.random() * genders.length)];

    if (type === "Nero") {
        colorName = "NERO";
        rarity = "Estremamente Rara";
        traits = "Creatura letale, imponente e temuta da tutti. Il vertice della catena alimentare.";
        tailType = (Math.random() > 0.5) ? "a Mazzaferrata (Morningstartail)" : "a Pugnale (Daggertail)";
        tailRarity = "Più rara tra gli adulti";
        age = (Math.floor(Math.random() * 60) + 70) + " anni (Adulto Gigante)";
        const blackNames = ["TAIRNEANACH (Tairn)", "CODAGH", "MAELSTROM", "MORGANATH"];
        name = blackNames[Math.floor(Math.random() * blackNames.length)];
    } else if (type === "Iridescente") {
        colorName = "IRIDESCENTE / CANGIANTE";
        rarity = "Unica - Stirpe Mitica";
        traits = "Capace di mimetizzarsi con il mondo. Custodisce la magia ancestrale del tempo.";
        tailType = "a Piuma (Feathertail)";
        tailRarity = "Anomalia (Stadio infantile)";
        age = "Meno di 2 anni (Cucciolo)";
        name = "ANDARNAURRAM (Andarna)";
    } else if (type === "Verde") {
        colorName = "VERDE";
        rarity = "Non comune";
        traits = "Mente militare acuta, formidabile arma tattica e protettore inflessibile.";
        tailType = "a Spada (Swordtail)";
        tailRarity = "Comune";
        age = (Math.floor(Math.random() * 50) + 30) + " anni";
        const greenNames = ["FEIRGE", "CATH", "SYLVAN", "VERDANTH"];
        name = greenNames[Math.floor(Math.random() * greenNames.length)];
    } else if (type === "Blu") {
        colorName = "BLU";
        rarity = "Rara";
        traits = "Spietato, fiero e glaciale. Riconosce solo cavalieri d'acciaio senza paura.";
        tailType = (Math.random() > 0.5) ? "a Pugnale (Daggertail)" : "a Scorpione (Scorpiontail)";
        tailRarity = "Rara";
        age = (Math.floor(Math.random() * 60) + 40) + " anni";
        const blueNames = ["SGAEYL", "DEIGH", "GLACIS", "AERAS"];
        name = blueNames[Math.floor(Math.random() * blueNames.length)];
    } else if (type === "Rosso") {
        colorName = "ROSSO";
        rarity = "Comune";
        traits = "Temperamento esplosivo, irascibile e implacabile nel fuoco d'assalto.";
        tailType = "a Scorpione (Scorpiontail)";
        tailRarity = "Meno comune";
        age = (Math.floor(Math.random() * 50) + 25) + " anni";
        const redNames = ["TEINE", "BAIDE", "IGNIS", "PYRROS"];
        name = redNames[Math.floor(Math.random() * redNames.length)];
    } else if (type === "Marrone") {
        colorName = "MARRONE";
        rarity = "Molto comune";
        traits = "La razza più devota e affidabile. Forza d'impatto e lealtà indissolubile.";
        tailType = "a Clava (Clubtail)";
        tailRarity = "Molto comune";
        age = (Math.floor(Math.random() * 60) + 20) + " anni";
        const brownNames = ["SOLAS", "MARBH", "TERRAS", "BRONTES"];
        name = brownNames[Math.floor(Math.random() * brownNames.length)];
    } else {
        colorName = "ARANCIONE";
        rarity = "Comune";
        traits = "I più imprevedibili e caotici in assoluto. Scelgono cavalieri audaci e spietati.";
        tailType = "a Scorpione (Scorpiontail)";
        tailRarity = "Meno comune";
        age = (Math.floor(Math.random() * 40) + 20) + " anni";
        const orangeNames = ["SLISEAG", "CHAOS", "VULCAN", "KORRAK"];
        name = orangeNames[Math.floor(Math.random() * orangeNames.length)];
    }

    // Salva automaticamente il drago nel profilo attivo
    saveBondedDragon({
        name,
        color: colorName,
        tail: tailType,
        traits: traits,
        age: age,
        gender: chosenGender
    });

    return `
        <p><strong>CAVALIERE:</strong> ${esc(playerName).toUpperCase()}</p>
        <hr style="border: 0; border-top: 1px solid rgba(240, 200, 149, 0.3); margin: 15px 0;">
        <p><strong>NOME DRAGO:</strong> ${name}</p>
        <p><strong>SESSO:</strong> ${chosenGender.toUpperCase()}</p>
        <p><strong>ETÀ:</strong> ${age}</p>
        <p style="color: var(--gold-color); font-size: 1.25rem; margin-top: 15px;"><strong>${colorName} con Coda ${tailType.toUpperCase()}</strong></p>
        <div style="font-size: 0.95rem; color: #aaa; text-align: left; padding: 10px; border-left: 2px solid var(--gold-color); margin-top: 10px; background: rgba(0,0,0,0.3);">
            <p><strong>Tratti (${rarity}):</strong> ${traits}</p>
            <p><strong>Coda (${tailRarity}):</strong> Arma micidiale in combattimento.</p>
        </div>
    `;
}

/* ---------- Gestione Sfondi ---------- */

const bgLayers = [document.getElementById('bg-a'), document.getElementById('bg-b')];
let activeLayer = 0;
let currentBg = null;

function setBackground(bgClass) {
    if (!bgClass || bgClass === currentBg) return;
    currentBg = bgClass;
    const next = bgLayers[1 - activeLayer];
    const cur = bgLayers[activeLayer];
    next.className = 'bg-layer ' + bgClass;
    requestAnimationFrame(() => {
        next.classList.add('active');
        cur.classList.remove('active');
    });
    activeLayer = 1 - activeLayer;
}

/* ---------- Transizioni ---------- */

function transitionScreen(hideId, showId, callback) {
    const hideEl = document.getElementById(hideId);
    const showEl = document.getElementById(showId);
    hideEl.style.opacity = '0';
    setTimeout(() => {
        hideEl.classList.add('hidden');
        showEl.classList.remove('hidden');
        setTimeout(() => { showEl.style.opacity = '1'; if (callback) callback(); }, 50);
    }, 800);
}

/* ---------- Intro e Slideshow ---------- */

function startSlideshow() {
    const inputName = document.getElementById('player-name').value.trim();
    if (inputName !== "") playerName = inputName;
    currentSlideIndex = 0;

    const vid = document.getElementById('lobby-video');
    if (vid) {
        vid.style.opacity = '0';
        setTimeout(() => vid.pause(), 1500);
    }

    setBackground("bg-parapetto");
    transitionScreen('intro-screen', 'slideshow-screen', playCurrentSlide);
}

function revealWords(container, text, speed) {
    container.innerHTML = '';
    const words = text.replace(/{nome}/g, playerName).split(" ");
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word + " ";
        container.appendChild(span);
        setTimeout(() => span.classList.add('visible'), speed * index);
    });
    return words.length;
}

function playCurrentSlide() {
    const textContainer = document.getElementById('slide-text');
    const btnContainer = document.getElementById('slide-btn-container');
    btnContainer.classList.add('hidden');
    btnContainer.style.opacity = '0';

    const speed = 180;
    const count = revealWords(textContainer, storySlides[currentSlideIndex], speed);

    setTimeout(() => {
        document.getElementById('next-slide-btn').innerText = (currentSlideIndex === storySlides.length - 1) ? "Inizia la Trebbiatura" : "Continua";
        btnContainer.classList.remove('hidden');
        setTimeout(() => { btnContainer.style.opacity = '1'; }, 50);
    }, speed * count + 400);
}

function nextSlide() {
    const slideshowEl = document.getElementById('slideshow-screen');
    slideshowEl.style.opacity = '0';
    setTimeout(() => {
        currentSlideIndex++;
        if (currentSlideIndex < storySlides.length) {
            slideshowEl.style.opacity = '1';
            playCurrentSlide();
        } else {
            slideshowEl.classList.add('hidden');
            const storyEl = document.getElementById('story-screen');
            storyEl.classList.remove('hidden');
            setTimeout(() => { storyEl.style.opacity = '1'; loadNode('start'); }, 50);
        }
    }, 800);
}

/* ---------- Gameplay / Storia ---------- */

function loadNode(nodeId) {
    const node = storyNodes[nodeId];
    if (!node) return;

    if (node.bg) setBackground(node.bg);
    const content = document.getElementById('gameplay-content');
    content.style.opacity = '0';
    setTimeout(() => { playNodeGameplay(node); content.style.opacity = '1'; }, 400);
}

function playNodeGameplay(node) {
    const textEl = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    choicesContainer.style.opacity = '0';

    if (node.death) { textEl.style.color = "#f0c895"; textEl.style.fontStyle = "italic"; }
    else if (node.knockout) { textEl.style.color = "#4a6fa5"; textEl.style.fontStyle = "italic"; }
    else { textEl.style.color = "#e6dbe3"; textEl.style.fontStyle = "normal"; }

    const speed = 140;
    const count = revealWords(textEl, node.text, speed);

    setTimeout(() => {
        const makeBtn = (label, handler, center) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn' + (center ? ' center-btn' : '');
            btn.textContent = label;
            btn.onclick = handler;
            choicesContainer.appendChild(btn);
        };

        if (node.death) {
            makeBtn("Continua", () => triggerGameOver('death'), true);
        } else if (node.knockout) {
            makeBtn("Continua", () => triggerGameOver('knockout'), true);
        } else if (node.empty) {
            makeBtn("Continua", () => triggerEmpty(), true);
        } else if (node.success) {
            makeBtn("Incontra il tuo Drago", () => triggerSuccess(node.dragonType), true);
        } else if (node.choices) {
            node.choices.forEach(choice => makeBtn(choice.text, () => loadNode(choice.target), false));
        }
        choicesContainer.style.opacity = '1';
    }, speed * count + 300);
}

/* ---------- Esiti & Cooldown ---------- */

function triggerGameOver(type) {
    store.set(KEY_STATE, type);
    store.set(KEY_TIME, Date.now());
    transitionScreen('story-screen', 'cooldown-screen', startCooldown);
}

function triggerEmpty() {
    document.getElementById('empty-text').innerHTML = document.getElementById('story-text').innerHTML;
    transitionScreen('story-screen', 'empty-screen');
}

function triggerSuccess(dragonType) {
    document.getElementById('result-stats').innerHTML = generateDragon(dragonType);
    transitionScreen('story-screen', 'result-screen');
}

function startCooldown() {
    clearInterval(timerInterval);
    const state = store.get(KEY_STATE);
    const timestamp = parseInt(store.get(KEY_TIME), 10);

    if (!state || isNaN(timestamp)) { resetGame(); return; }

    const duration = state === 'death' ? COOLDOWN_DEATH : COOLDOWN_KNOCKOUT;
    const titleEl = document.getElementById('cooldown-title');
    const descEl = document.getElementById('cooldown-desc');
    const timerEl = document.getElementById('cooldown-timer');

    if (state === 'death') {
        titleEl.innerText = "Caduto in Battaglia"; titleEl.style.color = "var(--accent-color)";
        descEl.innerText = "Il Quadrante non perdona i deboli. I draghi non piangono le loro vittime, le divorano.";
    } else {
        titleEl.innerText = "Svenuto in Combattimento"; titleEl.style.color = "var(--blue-color)";
        descEl.innerText = "Sei stato ferito o stordito, ma i tuoi compagni ti hanno trascinato in infermeria in tempo.";
    }

    function tick() {
        const timeLeft = duration - (Date.now() - timestamp);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            resetGame();
            return;
        }
        const hours = Math.floor(timeLeft / 3600000);
        const minutes = Math.floor((timeLeft % 3600000) / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerEl.innerText = [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');
    }

    tick();
    timerInterval = setInterval(tick, 1000);
}

function resetGame() {
    clearInterval(timerInterval);
    store.remove(KEY_STATE); store.remove(KEY_TIME);
    ['story-screen', 'cooldown-screen', 'result-screen', 'empty-screen', 'slideshow-screen', 'codex-screen'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.style.opacity = '0';
    });

    const active = getActiveUser();
    document.getElementById('player-name').value = active || "";
    playerName = active || "Cadetto";

    setBackground("bg-lobby");

    const vid = document.getElementById('lobby-video');
    if (vid) {
        vid.currentTime = 0;
        vid.play().catch(e => {});
        vid.style.opacity = '1';
    }

    const intro = document.getElementById('intro-screen');
    intro.classList.remove('hidden');
    setTimeout(() => { intro.style.opacity = '1'; }, 50);
}

window.addEventListener('load', () => {
    setBackground("bg-lobby");
    updateAuthUI();

    const state = store.get(KEY_STATE);
    const timestamp = parseInt(store.get(KEY_TIME), 10);
    if (state && !isNaN(timestamp)) {
        const duration = state === 'death' ? COOLDOWN_DEATH : COOLDOWN_KNOCKOUT;
        if (Date.now() - timestamp < duration) {
            const vid = document.getElementById('lobby-video');
            if (vid) { vid.pause(); vid.style.opacity = '0'; }
            document.getElementById('intro-screen').classList.add('hidden');
            document.getElementById('cooldown-screen').classList.remove('hidden');
            startCooldown();
            return;
        }
    }
    store.remove(KEY_STATE); store.remove(KEY_TIME);
});

/* ---------- Scintille al click ---------- */

document.addEventListener('pointerdown', e => createSparks(e.clientX, e.clientY));

function createSparks(x, y) {
    for (let i = 0; i < 8; i++) {
        const spark = document.createElement('div');
        spark.classList.add('spark');
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 20;
        spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        spark.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 600);
    }
}