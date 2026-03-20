// ==========================================
// script.js
// Меню, тест, история прохождений, пользовательское соглашение
// ==========================================

// ===== НАСТРОЙКА ОТДЕЛЬНОГО ХРАНИЛИЩА ДЛЯ КВИЗА =====
// Для нового квиза меняй только значение 'policy' на своё:
// 'macro', 'policy', 'finance', 'law' и т.д.
const QUIZ_STORAGE_NAMESPACE =
  window.QUIZ_STORAGE_NAMESPACE ||
  document.documentElement?.dataset?.quizStorage ||
  'policy';


const AGREEMENT_VERSION = '2026-03-17-v2';

const PAGE_TRANSITION_MIN_DELAY = 3000;
const PAGE_TRANSITION_STATUS_STEPS = [
  'Загружаем интерфейс раздела…',
  'Загружаем данные истории…',
  'Проверяем сохранённый прогресс…',
  'Почти готово, открываем страницу…'
];
let pageTransitionActive = false;
let pageTransitionStatusTimers = [];

function clearPageTransitionStatusTimers() {
  pageTransitionStatusTimers.forEach((timerId) => window.clearTimeout(timerId));
  pageTransitionStatusTimers = [];
}

function getTransitionLabel(targetHref = '', customLabel = '') {
  if (customLabel) return String(customLabel);
  const href = String(targetHref || '').toLowerCase();
  if (href.includes('_test.html')) return 'Загружаем тест';
  if (href.includes('index.html')) return 'Загружаем меню';
  return 'Загружаем раздел';
}

function ensurePageTransitionLoader() {
  if (document.getElementById('page-transition-loader')) return;
  if (!document.body) return;

  const loader = document.createElement('div');
  loader.id = 'page-transition-loader';
  loader.className = 'page-transition-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = `
    <div class="page-transition-panel">
      <div class="page-transition-spinner" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="page-transition-title">Загружаем раздел</div>
      <div class="page-transition-subtitle">Подготавливаем красивый переход между разделами</div>
      <div class="page-transition-status">Загружаем интерфейс раздела…</div>
      <div class="page-transition-progress"><span></span></div>
    </div>
  `;

  document.body.appendChild(loader);
}

function showPageTransitionLoader(targetHref = '', options = {}) {
  ensurePageTransitionLoader();

  const loader = document.getElementById('page-transition-loader');
  if (!loader) return;

  const title = loader.querySelector('.page-transition-title');
  const subtitle = loader.querySelector('.page-transition-subtitle');
  const status = loader.querySelector('.page-transition-status');
  const progress = loader.querySelector('.page-transition-progress span');
  const delay = Math.max(PAGE_TRANSITION_MIN_DELAY, Number.isFinite(Number(options.delay)) ? Number(options.delay) : 0);
  const statusSteps = Array.isArray(options.statusSteps) && options.statusSteps.length
    ? options.statusSteps.map((item) => String(item))
    : PAGE_TRANSITION_STATUS_STEPS;

  clearPageTransitionStatusTimers();

  if (title) {
    title.textContent = getTransitionLabel(targetHref, options.label);
  }

  if (subtitle) {
    subtitle.textContent = options.subtitle || 'Подготавливаем красивый переход между разделами';
  }

  if (status) {
    status.textContent = statusSteps[0] || 'Загружаем данные…';
    const stepDuration = statusSteps.length > 1 ? Math.max(350, Math.floor(delay / statusSteps.length)) : delay;
    statusSteps.slice(1).forEach((message, index) => {
      const timerId = window.setTimeout(() => {
        status.textContent = message;
        status.classList.remove('pulse');
        void status.offsetWidth;
        status.classList.add('pulse');
      }, stepDuration * (index + 1));
      pageTransitionStatusTimers.push(timerId);
    });
  }

  if (progress) {
    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = `pageTransitionProgressFill ${delay}ms linear forwards`;
  }

  document.body.classList.add('page-transition-active');
  window.requestAnimationFrame(() => {
    loader.classList.add('visible');
  });
}

function hidePageTransitionLoader() {
  const loader = document.getElementById('page-transition-loader');
  const progress = loader?.querySelector('.page-transition-progress span');
  const status = loader?.querySelector('.page-transition-status');

  clearPageTransitionStatusTimers();
  if (progress) {
    progress.style.animation = 'none';
  }
  status?.classList.remove('pulse');
  loader?.classList.remove('visible');
  document.body?.classList.remove('page-transition-active');
  pageTransitionActive = false;
}

function navigateWithLoader(targetHref, options = {}) {
  const href = String(targetHref || '').trim();
  if (!href || pageTransitionActive) return;

  try {
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(href, window.location.href);
    if (
      currentUrl.pathname === targetUrl.pathname &&
      currentUrl.search === targetUrl.search &&
      currentUrl.hash === targetUrl.hash
    ) {
      return;
    }
  } catch (error) {
    // Игнорируем ошибки парсинга и пробуем перейти по исходной строке.
  }

  pageTransitionActive = true;
  const requestedDelay = Number.isFinite(Number(options.delay)) ? Number(options.delay) : 0;
  const delay = Math.max(PAGE_TRANSITION_MIN_DELAY, requestedDelay);
  showPageTransitionLoader(href, { ...options, delay });

  window.setTimeout(() => {
    if (options.replace) {
      window.location.replace(href);
      return;
    }
    window.location.href = href;
  }, delay);
}

window.addEventListener('pageshow', hidePageTransitionLoader);
window.navigateWithLoader = navigateWithLoader;


// ===== НАСТРОЙКА БУРГЕР-МЕНЮ =====
// Чтобы добавить новый раздел, просто допиши объект в массив APP_MENU_ITEMS.
// type: 'link'   -> переход на другой HTML-файл
// type: 'action' -> действие внутри текущего квиза
//
// Важно:
// 1) Верхний уровень меню — это разделы/темы.
// 2) Кнопки 'Изучить тесты' и 'История прохождений' автоматически
//    показываются внутри активного раздела.
// 3) При желании можно добавить и свои вложенные кнопки через children.
const APP_MENU_ITEMS = window.APP_MENU_ITEMS || [
  {
    type: 'link',
    label: 'Экономическая политика',
    href: 'index.html',
    description: 'Текущий набор тестов',
    children: []
  },
  {
    type: 'action',
    label: 'Изучить тесты',
    action: 'study',
    description: 'Открыть все вопросы и ответы'
  },
  {
    type: 'action',
    label: 'История прохождений',
    action: 'history',
    description: 'Посмотреть прошлые попытки'
  },
  {
    type: 'link',
    label: 'Деньги и Банки',
    href: 'money_index.html',
    description: 'Перейти на другой набор тестов'
  },
  {
    type: 'link',
    label: 'Макроэкономика',
    href: 'macro_index.html',
    description: 'Перейти на другой набор тестов'
  }
];

const AGREEMENT_TEXT_HTML = `
      <h3 class="agreement-doc-title">ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ</h3>
      <p class="agreement-doc-meta">Вступление в силу: после нажатия "Принять"<br>Telegram-бот: Policy Quiz<br>Владелец бота: Sayfiddinov™<br>Контакты: @SayfiddinovM</p>
      <h4 class="agreement-doc-section">1. Общие положения</h4>
      <p>1.1. Настоящее Пользовательское соглашение (далее - «Соглашение») регулирует порядок использования Telegram-бота Policy Quiz (далее - «Бот»), содержащего тесты, задания, обучающие материалы, интерфейсы прохождения тестирования, подсчет результатов, статистику, а также иные связанные сервисы и функции.</p>
      <p>1.2. Нажимая кнопку «Принять», начиная использование Бота, проходя тесты, просматривая материалы или иным образом используя функционал Бота, пользователь подтверждает, что ознакомился с настоящим Соглашением, понял его условия, принимает условия полностью и без оговорок и обязуется соблюдать настоящее Соглашение, правила Бота и применимое законодательство.</p>
      <p>1.3. Если пользователь не согласен с условиями настоящего Соглашения полностью либо частично, он обязан воздержаться от использования Бота и немедленно прекратить взаимодействие с ним.</p>
      <p>1.4. Администрация Бота вправе в любое время изменять, дополнять, сокращать или обновлять настоящее Соглашение без предварительного индивидуального уведомления каждого пользователя. Новая редакция вступает в силу с момента ее размещения или доведения до сведения пользователя, если иной срок не указан отдельно.</p>
      <p>1.5. Пользователь обязан самостоятельно отслеживать актуальную редакцию Соглашения. Продолжение использования Бота после публикации новой редакции означает согласие пользователя с измененными условиями.</p>
      <p>1.6. Настоящее Соглашение является публичным предложением о правилах использования Бота и действует в отношении всех пользователей вне зависимости от способа доступа, устройства, аккаунта Telegram, страны нахождения и статуса регистрации.</p>
      <h4 class="agreement-doc-section">2. Термины и определения</h4>
      <p>Для целей настоящего Соглашения используются следующие термины:</p>
      <p>2.1. Бот - Telegram-бот Policy Quiz, включая все диалоги, команды, встроенные кнопки, сообщения, сценарии, программный код, базы данных, тесты, результаты, визуальные элементы, тексты, изображения, скрипты и иные компоненты.</p>
      <p>2.2. Администрация - владелец Бота, разработчик, правообладатель или иное лицо, уполномоченное управлять Ботом и обеспечивать его работу.</p>
      <p>2.3. Пользователь - любое физическое лицо, получающее доступ к Боту и использующее его в личных, учебных, информационных либо иных не запрещенных целях.</p>
      <p>2.4. Контент - любые тексты, вопросы, ответы, формулировки заданий, подсказки, интерфейсные элементы, статистика, результаты, изображения, структура базы тестов, программные решения, дизайн, логотипы и иные материалы, доступные через Бота.</p>
      <p>2.5. Тестирование - процесс прохождения пользователем тестов, заданий, опросов, учебных или контрольных материалов, доступных в Боте.</p>
      <p>2.6. Результат - отображаемый Ботом итог прохождения тестирования, включая баллы, процент правильных ответов, количество ошибок, отметки о завершении, время прохождения и иные показатели.</p>
      <p>2.7. Нарушение - любое действие или бездействие пользователя, противоречащее настоящему Соглашению, правилам честного использования, интересам Бота, других пользователей либо законодательству.</p>
      <h4 class="agreement-doc-section">3. Предмет Соглашения</h4>
      <p>3.1. Администрация предоставляет пользователю ограниченное, неисключительное, отзывное, непередаваемое право использования Бота исключительно в рамках его функционального назначения и на условиях настоящего Соглашения.</p>
      <p>3.2. Бот предназначен, в частности, для прохождения тестов, самопроверки знаний, обучения, тренировки и повторения материалов, ознакомления с результатами прохождения и использования вспомогательных функций Бота.</p>
      <p>3.3. Использование Бота допускается только способами, прямо предусмотренными его интерфейсом и функционалом.</p>
      <p>3.4. Любое использование Бота вне его обычного назначения, а также попытки вмешательства в логику работы Бота, базы вопросов, алгоритмы выборки, проверку результатов, защитные механизмы и программный код запрещены.</p>
      <h4 class="agreement-doc-section">4. Условия доступа к Боту</h4>
      <p>4.1. Для доступа к Боту пользователь должен иметь совместимое устройство, установленное приложение Telegram и доступ к сети Интернет.</p>
      <p>4.2. Администрация не гарантирует, что Бот будет доступен без перерывов, ошибок, задержек, технических сбоев или на всех устройствах одинаково.</p>
      <p>4.3. Отдельные функции Бота могут быть доступны без дополнительной регистрации, а отдельные - только после выполнения дополнительных условий, если такие функции будут введены в будущем.</p>
      <p>4.4. Администрация вправе временно приостанавливать работу Бота, ограничивать доступ к отдельным разделам, изменять интерфейс, структуру, количество и содержание тестов, удалять или заменять вопросы и материалы, а также проводить профилактические, технические и иные работы без предварительного уведомления.</p>
      <p>4.5. Пользователь самостоятельно обеспечивает наличие интернет-соединения, исправность своего устройства, программного обеспечения и приложения Telegram.</p>
      <h4 class="agreement-doc-section">5. Правила использования Бота</h4>
      <p>5.1. Пользователь обязуется использовать Бота добросовестно, разумно и исключительно в законных целях.</p>
      <p>5.2. Пользователю разрешается проходить размещенные в Боте тесты, использовать Бота для личной подготовки, обучения и самопроверки, просматривать собственные результаты, если такой функционал предусмотрен, а также использовать Бота иным способом, прямо допускаемым его интерфейсом.</p>
      <p>5.3. Пользователь обязан соблюдать настоящее Соглашение, не нарушать права Администрации и третьих лиц, не предпринимать действий, способных привести к сбоям или недоступности Бота, не обходить ограничения, установленные Ботом, и не вмешиваться в его работу техническими или программными средствами.</p>
      <h4 class="agreement-doc-section">6. Правила честного прохождения тестов</h4>
      <p>6.1. Пользователь обязан проходить тесты честно и самостоятельно, если иное прямо не предусмотрено форматом конкретного теста.</p>
      <p>6.2. В Боте запрещается читерство, включая, но не ограничиваясь: использование скриптов, ботов, автокликеров, макросов, расширений и иных средств автоматизации; подбор ответов путем программного перебора; использование инструментов для анализа, подмены, изменения или автозаполнения ответов; вмешательство в таймер, последовательность вопросов, систему подсчета баллов, результаты, ограничения по времени или попыткам; изменение кода страницы, встроенного веб-интерфейса или сценариев работы через DevTools, пользовательские скрипты, расширения браузера или иные методы; перехват, изменение или подделка сетевых запросов; искусственное получение преимущества над системой или другими пользователями; массовое обновление интерфейса, обход ограничений и повторные попытки ради искажения результата; имитация прохождения теста другим лицом либо от имени другого лица; предоставление третьим лицам доступа к своей сессии, если такой доступ ограничен; подделка результатов, скриншотов, данных о прохождении либо статистики.</p>
      <p>6.3. Администрация вправе по своему усмотрению определять наличие признаков недобросовестного поведения, в том числе на основании аномально быстрого прохождения, технических следов автоматизации, повторяющихся подозрительных действий, вмешательства в клиентский код, попыток обойти интерфейсные или логические ограничения, атипичных запросов и любых иных признаков злоупотребления.</p>
      <p>6.4. При наличии подозрений в читерстве Администрация вправе без объяснения причин аннулировать результат, запретить доступ к отдельному тесту, ограничить, приостановить или полностью прекратить доступ к Боту, сохранить техническую информацию о нарушении и принять иные разумные меры по защите Бота.</p>
      <p>6.5. Пользователь соглашается, что результаты, полученные с нарушением настоящего Соглашения, могут быть признаны недействительными, удалены или не учитываться.</p>
      <h4 class="agreement-doc-section">7. Запрещенные действия</h4>
      <p>7.1. Пользователю запрещается использовать Бота в нарушение законодательства; предпринимать попытки несанкционированного доступа к коду, серверной части, административным разделам, базам данных, файлам, логам, API или закрытым функциям; осуществлять reverse engineering, декомпиляцию, дизассемблирование, декодирование, вскрытие логики работы Бота, если иное прямо не разрешено законом; копировать, парсить, собирать, выгружать, индексировать или массово извлекать базу тестов, вопросы, ответы, структуру заданий и иные материалы автоматизированными средствами; использовать ботов, скрипты, эмуляторы, прокси-цепочки, средства подмены окружения или обхода ограничений; тестировать уязвимости, проводить сканирование, брутфорс, нагрузочные атаки, DDoS, вмешательство в сетевое взаимодействие; распространять вредоносный код, вирусы, шпионские компоненты или иные опасные элементы; изменять отображение или поведение Бота таким образом, чтобы это влияло на честность прохождения тестов; использовать Бота для обмана, мошенничества, введения в заблуждение, подмены личности, дискредитации других лиц; удалять или скрывать уведомления об авторских правах, фирменные обозначения, предупреждения или ссылки на правообладателя; воспроизводить, публиковать, продавать, сдавать в аренду, лицензировать, передавать или коммерчески использовать Контент Бота без письменного разрешения Администрации; создавать зеркала, копии, клоны Бота либо сервисы, конкурирующие с ним на основе заимствованного Контента.</p>
      <p>7.2. Запрещается также любое поведение, которое Администрация обоснованно считает злоупотреблением функционалом Бота, даже если оно не перечислено в настоящем разделе буквально.</p>
      <h4 class="agreement-doc-section">8. Интеллектуальная собственность</h4>
      <p>8.1. Все исключительные права на Бота и его Контент принадлежат Администрации либо используются ею на законных основаниях.</p>
      <p>8.2. Охране подлежат, в том числе: база тестов и вопросов; формулировки заданий; варианты ответов; структура, компоновка и логика тестов; дизайн, интерфейс, шрифтовые и графические решения; скрипты, код, алгоритмы, подборка материалов; логотипы, наименования, обозначения и иные элементы индивидуализации.</p>
      <p>8.3. Пользователь не приобретает никаких прав собственности на Бота или его Контент, кроме прямо предоставленного права пользования в рамках настоящего Соглашения.</p>
      <p>8.4. Без предварительного письменного согласия Администрации запрещается полностью или частично копировать Контент, публиковать его на иных ресурсах, продавать, распространять, передавать третьим лицам и использовать для создания собственных тестовых баз, приложений, Telegram-ботов, сайтов или программ.</p>
      <p>8.5. Допускается только такое использование Контента, которое прямо разрешено функционалом Бота или письменным разрешением Администрации.</p>
      <h4 class="agreement-doc-section">9. Результаты тестирования</h4>
      <p>9.1. Результаты, отображаемые в Боте, предоставляются в информационных и учебных целях, если иное прямо не указано Администрацией.</p>
      <p>9.2. Администрация не гарантирует, что результат теста подтверждает официальный уровень знаний, является государственным, академическим или профессиональным заключением, может использоваться как официальный документ либо будет признан третьими лицами.</p>
      <p>9.3. Бот может допускать технические ошибки, погрешности, неточности в формулировках, ответах, подсчетах, отображении статистики и иных элементах.</p>
      <p>9.4. Администрация вправе пересчитывать результаты, исправлять обнаруженные ошибки, аннулировать результаты, полученные с нарушениями, и менять структуру оценки без предварительного уведомления.</p>
      <p>9.5. Пользователь принимает на себя риск использования результатов Бота в личных, учебных, профессиональных или иных целях.</p>
      <h4 class="agreement-doc-section">10. Персональные данные и техническая информация</h4>
      <p>10.1. При использовании Бота могут обрабатываться технические данные, необходимые для работы Бота, обеспечения безопасности, предотвращения злоупотреблений, сохранения настроек и фиксирования факта принятия настоящего Соглашения.</p>
      <p>10.2. К таким данным могут относиться: Telegram ID пользователя, username, имя профиля, технические идентификаторы, дата и время взаимодействия, тип устройства, язык интерфейса, данные о нажатии кнопок, сведения о прохождении тестов, локальные и серверные технические данные, а также признаки недобросовестной активности.</p>
      <p>10.3. Если в Боте будут введены регистрация, формы обратной связи, подписка, сохранение результатов, личный кабинет или иные механизмы сбора данных, пользователь соглашается с обработкой таких данных в пределах, необходимых для функционирования соответствующих сервисов.</p>
      <p>10.4. Условия обработки персональных данных подробно определяются отдельной Политикой конфиденциальности, если она размещена или направляется пользователю отдельно.</p>
      <p>10.5. Пользователь понимает и соглашается, что отдельные данные могут сохраняться в целях запоминания факта согласия с Соглашением, сохранения настроек, обеспечения стабильной работы Бота и защиты от злоупотреблений.</p>
      <h4 class="agreement-doc-section">11. Ограничение гарантий</h4>
      <p>11.1. Бот предоставляется по принципу «как есть» и «как доступно».</p>
      <p>11.2. Администрация не гарантирует, что Бот будет работать непрерывно и без ошибок, тесты будут всегда доступны, все вопросы и ответы являются безупречно точными, любые ошибки будут немедленно исправлены, Бот будет совместим с каждым устройством, а также что Бот не содержит уязвимостей, задержек или иных технических ограничений.</p>
      <p>11.3. Администрация не предоставляет пользователю никаких гарантий, прямо не закрепленных в настоящем Соглашении.</p>
      <h4 class="agreement-doc-section">12. Ограничение ответственности</h4>
      <p>12.1. В максимально допустимой законом степени Администрация не несет ответственности за невозможность использования Бота по причинам, не зависящим от Администрации; технические сбои, ошибки устройства, сети, провайдера, Telegram или хостинга; потерю данных, результатов, настроек, если иное прямо не предусмотрено; любые прямые или косвенные убытки, упущенную выгоду, потерю репутации, утрату возможностей, возникшие в связи с использованием либо невозможностью использования Бота; действия третьих лиц; решения пользователя, принятые на основе результатов тестирования; временную или постоянную недоступность Бота; ошибки, опечатки, неточности и устаревшие сведения в тестах.</p>
      <p>12.2. Если законодательство конкретной страны не допускает полного исключения ответственности, ответственность Администрации ограничивается минимально допустимым объемом.</p>
      <p>12.3. Пользователь использует Бота на свой риск.</p>
      <h4 class="agreement-doc-section">13. Меры реагирования на нарушения</h4>
      <p>13.1. В случае нарушения настоящего Соглашения Администрация вправе без предварительного уведомления и по своему усмотрению сделать предупреждение, ограничить доступ к отдельным функциям, заблокировать попытку прохождения теста, аннулировать результаты, временно ограничить доступ к Боту, бессрочно прекратить доступ к Боту, удалить связанные технические данные или, наоборот, сохранить их как доказательство нарушения, а также предпринять иные меры защиты.</p>
      <p>13.2. Применение мер не требует предварительного доказывания нарушения в судебном порядке для целей внутреннего управления доступом к Боту.</p>
      <p>13.3. Администрация не обязана раскрывать пользователю алгоритмы выявления нарушений, античит-механизмы и внутренние критерии оценки подозрительных действий.</p>
      <p>13.4. Пользователь соглашается, что защита честности тестирования, Контента и технической инфраструктуры является законной и разумной целью Администрации.</p>
      <h4 class="agreement-doc-section">14. Ссылки на сторонние ресурсы</h4>
      <p>14.1. В Боте могут размещаться ссылки на сторонние сайты, сервисы, платформы, видео, документы или иные ресурсы.</p>
      <p>14.2. Администрация не контролирует такие ресурсы и не несет ответственности за их содержание, политику конфиденциальности, безопасность, доступность, законность и действия их владельцев.</p>
      <p>14.3. Переход по таким ссылкам пользователь совершает на свой риск.</p>
      <h4 class="agreement-doc-section">15. Изменение, приостановка и прекращение работы Бота</h4>
      <p>15.1. Администрация вправе в любое время изменять Бота, дополнять его новыми функциями, удалять имеющиеся разделы, менять количество тестов и вопросы, перерабатывать алгоритмы случайной выборки, проводить технические обновления и полностью прекратить работу Бота.</p>
      <p>15.2. Пользователь соглашается, что Администрация не обязана сохранять любую функцию в неизменном виде неограниченно долго.</p>
      <p>15.3. Администрация не несет ответственности за последствия изменений, обновлений, удаления функций или прекращения работы Бота.</p>
      <h4 class="agreement-doc-section">16. Обратная связь и сообщения пользователя</h4>
      <p>16.1. Если пользователь направляет Администрации предложения, замечания, сообщения об ошибках, идеи по доработке, жалобы или иную обратную связь, такая информация может использоваться Администрацией для улучшения Бота без выплаты вознаграждения, если иное не согласовано отдельно.</p>
      <p>16.2. Пользователь обязуется не направлять через формы связи, сообщения или иные каналы незаконный контент, оскорбления и угрозы, спам, вредоносные вложения, заведомо ложную информацию и материалы, нарушающие права третьих лиц.</p>
      <p>16.3. Администрация вправе не отвечать на все обращения пользователей и самостоятельно определяет сроки и формат ответа.</p>
      <h4 class="agreement-doc-section">17. Возраст пользователя</h4>
      <p>17.1. Пользователь, принимающий настоящее Соглашение, подтверждает, что обладает необходимой дееспособностью для совершения таких действий в соответствии с применимым правом.</p>
      <p>17.2. Если пользователь не достиг возраста, позволяющего самостоятельно принимать такие условия, использование Бота допускается только с согласия законного представителя, если это требуется законодательством.</p>
      <p>17.3. Администрация не обязана проверять возраст каждого пользователя, но вправе ввести соответствующие ограничения в будущем.</p>
      <h4 class="agreement-doc-section">18. Применимое право и споры</h4>
      <p>18.1. К настоящему Соглашению применяется право, указанное владельцем Бота, если иное не вытекает из императивных норм законодательства.</p>
      <p>18.2. Все споры и разногласия по возможности решаются путем переговоров и направления письменного обращения Администрации.</p>
      <p>18.3. Если спор не урегулирован мирным путем, он подлежит рассмотрению в порядке и в суде, определяемых применимым законодательством и правилами подсудности.</p>
      <p>18.4. До обращения в суд пользователь, если это допускается законом, обязуется направить Администрации претензию по контактам, указанным в описании Бота, сообщениях либо ином официальном канале связи, с разумным сроком для ответа.</p>
      <h4 class="agreement-doc-section">19. Недействительность отдельных положений</h4>
      <p>19.1. Если какое-либо положение настоящего Соглашения будет признано недействительным, незаконным или неисполнимым, это не влияет на действительность остальных положений.</p>
      <p>19.2. Вместо недействительного положения применяется максимально близкое по смыслу и допустимое законом положение.</p>
      <h4 class="agreement-doc-section">20. Полнота Соглашения</h4>
      <p>20.1. Настоящее Соглашение составляет полное соглашение между пользователем и Администрацией относительно использования Бота, если иное прямо не предусмотрено отдельными документами.</p>
      <p>20.2. Дополнительно к настоящему Соглашению для Бота могут действовать Политика конфиденциальности, правила отдельных тестов, уведомления о cookies для встроенных веб-страниц, специальные условия для отдельных разделов и иные документы, размещенные или доведенные до сведения пользователя.</p>
      <p>20.3. В случае противоречия между настоящим Соглашением и специальными правилами конкретного раздела, преимущество имеют специальные правила в соответствующей части, если иное прямо не указано.</p>
      <h4 class="agreement-doc-section">21. Подтверждение согласия</h4>
      <p>21.1. Пользователь подтверждает, что до начала использования Бота ему была предоставлена возможность ознакомиться с текстом Соглашения, открыть и прочитать его полностью, а также принять или отклонить условия.</p>
      <p>21.2. Нажатие кнопки «Принять» считается надлежащим подтверждением согласия пользователя с настоящим Соглашением.</p>
      <p>21.3. Факт принятия может фиксироваться техническими средствами Бота, включая сохранение отметки о согласии, дату, время, версию документа и иные необходимые данные.</p>
      <p>21.4. При отклонении условий Соглашения доступ к Боту или его функционалу может быть полностью или частично ограничен.</p>
      <h4 class="agreement-doc-section">22. Контакты Администрации</h4>
      <p>По вопросам, связанным с настоящим Соглашением, работой Бота, жалобами, сообщениями об ошибках и иными обращениями, пользователь может связаться с Администрацией:</p>
      <p>Telegram: @SayfiddinovM<br>Владелец: Sayfiddinov™</p>
      <h4 class="agreement-doc-section">23. Краткая античит-оговорка</h4>
      <p>23.1. Пользователь отдельно уведомляется и соглашается, что любые попытки читерства, автоматизации, обхода ограничений, вмешательства в код, подделки результатов, использования ботов, скриптов, DevTools, подмены запросов, многократного искусственного прохождения и иные способы недобросовестного получения результата запрещены.</p>
      <p>23.2. При выявлении таких действий Администрация вправе аннулировать результат и заблокировать доступ без возврата каких-либо преимуществ, если они были предоставлены.</p>
      <p>23.3. Администрация вправе применять технические средства обнаружения нарушений и не раскрывать детали таких средств.</p>`;

const STORAGE_KEYS = {
  HISTORY: `quizHistory_${QUIZ_STORAGE_NAMESPACE}_v1`,
  ACTIVE_SESSION: `quizActiveSession_${QUIZ_STORAGE_NAMESPACE}_v1`,
  TIMER: `quizTimer_${QUIZ_STORAGE_NAMESPACE}_v1`,
  QUESTION_COUNT: `quizQuestionCount_${QUIZ_STORAGE_NAMESPACE}_v1`,
  THEME_FILE: `quizCurrentThemeFile_${QUIZ_STORAGE_NAMESPACE}_v1`,
  USED_QUESTIONS: `quizUsedQuestions_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_STATUS: `quizAgreementStatus_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_VERSION: `quizAgreementVersion_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_ACCEPTED_AT: `quizAgreementAcceptedAt_${QUIZ_STORAGE_NAMESPACE}_v1`
};

const HISTORY_KEY = STORAGE_KEYS.HISTORY;
const ACTIVE_SESSION_KEY = STORAGE_KEYS.ACTIVE_SESSION;
const TIMER_KEY = STORAGE_KEYS.TIMER;
const QUESTION_COUNT_KEY = STORAGE_KEYS.QUESTION_COUNT;
const THEME_FILE_KEY = STORAGE_KEYS.THEME_FILE;
const USED_QUESTIONS_KEY = STORAGE_KEYS.USED_QUESTIONS;
const AGREEMENT_STATUS_KEY = STORAGE_KEYS.AGREEMENT_STATUS;
const AGREEMENT_VERSION_KEY = STORAGE_KEYS.AGREEMENT_VERSION;
const AGREEMENT_ACCEPTED_AT_KEY = STORAGE_KEYS.AGREEMENT_ACCEPTED_AT;

// ===== ОПРЕДЕЛЕНИЕ СТРАНИЦЫ =====
const isTestPage = !!document.getElementById('question');
const app = document.getElementById('app');

// ===== ПЕРЕМЕННЫЕ ТЕСТА =====
let timeLimit = 30;
let session = null;
let tests = [];
let timer = null;
let timeLeft = 0;
let selected = null;
let historyUiReady = false;
let agreementUiReady = false;
let studyUiReady = false;
let appMenuUiReady = false;
let appMenuActionMap = new Map();
let studyState = { loaded: false, loading: false, error: '', items: [] };

// ===== HELPERS =====
function getTimerValue() {
  const custom = parseInt(document.getElementById('custom-timer')?.value, 10);
  const preset = parseInt(document.getElementById('preset-timer')?.value, 10);
  return custom || preset || 30;
}

function getQuestionsCount() {
  const custom = parseInt(document.getElementById('custom-count')?.value, 10);
  const preset = parseInt(document.getElementById('preset-count')?.value, 10);
  return custom || preset || 15;
}

function getSelectedTheme() {
  return document.getElementById('theme-select')?.value || 'policy_tests.json';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateTimeToMinute(timestamp) {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeToSecond(timestamp) {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getMinuteSeed(timestamp) {
  const d = new Date(timestamp);
  return Number(
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}

function formatDuration(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function shuffleArray(items) {
  const arr = [...(Array.isArray(items) ? items : [])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeQuestionKeyPart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getQuestionKey(question) {
  if (question && question.id !== undefined && question.id !== null && question.id !== '') {
    return `id:${String(question.id)}`;
  }

  const normalizedQuestion = normalizeQuestionKeyPart(question?.question);
  const normalizedOptions = Array.isArray(question?.options)
    ? question.options.map(normalizeQuestionKeyPart).join('||')
    : '';
  const answerIndex = Number.isInteger(Number(question?.answer)) ? Number(question.answer) : '';

  return `q:${normalizedQuestion}::o:${normalizedOptions}::a:${answerIndex}`;
}

function dedupeQuestions(items) {
  const unique = [];
  const seen = new Set();

  (Array.isArray(items) ? items : []).forEach((question) => {
    const key = getQuestionKey(question);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({ ...question, __questionKey: key });
  });

  return unique;
}

function getUsedQuestionsState() {
  try {
    const raw = localStorage.getItem(USED_QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsedQuestionsState(state) {
  localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(state || {}));
}

function selectRandomQuestions(sourceQuestions, requestedCount, themeFile) {
  const uniqueQuestions = dedupeQuestions(sourceQuestions);
  const totalAvailable = uniqueQuestions.length;
  const totalNeeded = Math.min(Math.max(1, Number(requestedCount) || 1), totalAvailable || 0);

  if (!totalAvailable || !totalNeeded) return [];

  const usedState = getUsedQuestionsState();
  const usedForTheme = Array.isArray(usedState[themeFile]) ? usedState[themeFile] : [];
  const usedSet = new Set(usedForTheme);

  const unusedQuestions = uniqueQuestions.filter(q => !usedSet.has(q.__questionKey));
  const picked = shuffleArray(unusedQuestions).slice(0, totalNeeded);

  let nextUsed;

  if (picked.length < totalNeeded) {
    const pickedKeys = new Set(picked.map(q => q.__questionKey));
    const refillPool = uniqueQuestions.filter(q => !pickedKeys.has(q.__questionKey));
    picked.push(...shuffleArray(refillPool).slice(0, totalNeeded - picked.length));
    nextUsed = picked.map(q => q.__questionKey);
  } else {
    nextUsed = [...new Set([...usedForTheme, ...picked.map(q => q.__questionKey)])];
  }

  usedState[themeFile] = nextUsed;
  saveUsedQuestionsState(usedState);

  return picked.map(({ __questionKey, ...question }) => question);
}

function getThemeLabel(fileName) {
  const map = {
    'iqtisodiy_siyosat_tests_part_1.json': 'Вопросы 1-50',
    'iqtisodiy_siyosat_tests_part_2.json': 'Вопросы 51-100',
    'iqtisodiy_siyosat_tests_part_3.json': 'Вопросы 101-150',
    'iqtisodiy_siyosat_tests_part_4.json': 'Вопросы 151-200',
    'iqtisodiy_siyosat_tests_part_5.json': 'Вопросы 201-250',
    'iqtisodiy_siyosat_tests_part_6.json': 'Вопросы 251-304',
    'policy_tests.json': 'Все вопросы (Микс)'
  };
  return map[fileName] || fileName || 'Неизвестная тема';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function generateHistoryId(timestamp) {
  const history = getHistory();
  const minuteSeed = getMinuteSeed(timestamp);
  const sameMinuteCount = history.filter(item => item.minuteSeed === minuteSeed).length + 1;

  const partA = (minuteSeed * 37 + 73) % 100000000;
  const partB = ((minuteSeed % 1000000) * (sameMinuteCount + 11) + 97) % 1000000;
  const digitSum = String(minuteSeed)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  const checksum = (digitSum * 19 + sameMinuteCount * 7 + (partA % 97)) % 1000;

  return `H-${String(partA).padStart(8, '0')}-${String(partB).padStart(6, '0')}-${String(checksum).padStart(3, '0')}`;
}

function downloadTextFile(fileName, content, mimeType = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function isAgreementAccepted() {
  return localStorage.getItem(AGREEMENT_STATUS_KEY) === 'accepted'
    && localStorage.getItem(AGREEMENT_VERSION_KEY) === AGREEMENT_VERSION;
}

function setAgreementAccepted() {
  localStorage.setItem(AGREEMENT_STATUS_KEY, 'accepted');
  localStorage.setItem(AGREEMENT_VERSION_KEY, AGREEMENT_VERSION);
  localStorage.setItem(AGREEMENT_ACCEPTED_AT_KEY, String(Date.now()));
}

function setAgreementDeclined() {
  localStorage.setItem(AGREEMENT_STATUS_KEY, 'declined');
  localStorage.setItem(AGREEMENT_VERSION_KEY, AGREEMENT_VERSION);
}

function initAgreementUi() {
  if (agreementUiReady) return;
  agreementUiReady = true;

  const overlay = document.createElement('div');
  overlay.id = 'agreement-overlay';
  overlay.className = 'agreement-overlay hidden';
  overlay.innerHTML = `
    <div class="agreement-panel">
      <div class="agreement-badge">Важно</div>
      <h2 class="agreement-title">Пользовательское соглашение</h2>
      <p class="agreement-lead">Для продолжения нужно принять условия использования бота.</p>

      <div id="agreement-short" class="agreement-short">
        <div>• честное прохождение тестов без читерства;</div>
        <div>• запрет на вмешательство в работу бота и подделку результатов;</div>
        <div>• фиксация подозрительных действий во время прохождения теста.</div>
      </div>

      <div id="agreement-text" class="agreement-text hidden">${AGREEMENT_TEXT_HTML}</div>

      <div class="agreement-actions">
        <button id="agreement-read" class="main secondary">Прочитать соглашение</button>
        <button id="agreement-decline" class="main danger">Отклонить</button>
        <button id="agreement-accept" class="main">Принять</button>
      </div>

      <div id="agreement-status" class="agreement-status hidden"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#agreement-read')?.addEventListener('click', () => {
    const text = overlay.querySelector('#agreement-text');
    const readBtn = overlay.querySelector('#agreement-read');
    if (!text || !readBtn) return;
    text.classList.toggle('hidden');
    readBtn.textContent = text.classList.contains('hidden') ? 'Прочитать соглашение' : 'Скрыть соглашение';
  });

  overlay.querySelector('#agreement-accept')?.addEventListener('click', () => {
    setAgreementAccepted();
    hideAgreementOverlay();
  });

  overlay.querySelector('#agreement-decline')?.addEventListener('click', () => {
    setAgreementDeclined();
    showAgreementDeclinedState();
  });
}

function showAgreementOverlay() {
  initAgreementUi();
  document.body.classList.add('agreement-page-locked');
  document.getElementById('agreement-overlay')?.classList.remove('hidden');
}

function hideAgreementOverlay() {
  document.body.classList.remove('agreement-page-locked');
  document.getElementById('agreement-overlay')?.classList.add('hidden');
}

function showAgreementDeclinedState() {
  initAgreementUi();
  const overlay = document.getElementById('agreement-overlay');
  const status = document.getElementById('agreement-status');
  if (!overlay || !status) return;

  status.classList.remove('hidden');
  status.innerHTML = 'Вы отклонили соглашение. Без его принятия доступ к боту закрыт.';

  const acceptBtn = overlay.querySelector('#agreement-accept');
  const readBtn = overlay.querySelector('#agreement-read');
  const declineBtn = overlay.querySelector('#agreement-decline');

  if (acceptBtn) acceptBtn.textContent = 'Вернуться и принять';
  if (readBtn) readBtn.textContent = 'Прочитать соглашение';
  if (declineBtn) declineBtn.disabled = true;

  showAgreementOverlay();
}

function enforceAgreementOnEntry() {
  if (isAgreementAccepted()) {
    hideAgreementOverlay();
    return true;
  }

  if (isTestPage) {
    navigateWithLoader('policy_index.html', { replace: true, delay: 120, label: 'Возвращаемся в меню' });
    return false;
  }

  showAgreementOverlay();
  if (localStorage.getItem(AGREEMENT_STATUS_KEY) === 'declined') {
    showAgreementDeclinedState();
  }
  return false;
}


function initStudyUi(options = {}) {
  if (studyUiReady) return;
  studyUiReady = true;

  const withButton = options.withButton === true;
  let button = null;

  if (withButton) {
    button = document.createElement('button');
    button.id = 'study-toggle';
    button.className = 'history-toggle study-toggle';
    button.textContent = 'Изучить тесты';
  }

  const modal = document.createElement('div');
  modal.id = 'study-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-panel study-panel">
      <div class="history-panel-header">
        <div>
          <div class="history-title">Изучить тесты</div>
          <div class="history-subtitle">Правильный ответ выделен зелёным</div>
        </div>
        <button id="study-close" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <div id="study-list" class="study-list">
        <div class="history-empty">Загрузка тестов...</div>
      </div>
    </div>
  `;

  if (button) document.body.appendChild(button);
  document.body.appendChild(modal);

  button?.addEventListener('click', openStudyModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeStudyModal();
  });
  modal.querySelector('#study-close')?.addEventListener('click', closeStudyModal);
}

function openStudyModal() {
  document.body.classList.add('study-modal-open');
  document.body.classList.add('app-surface-open');
  document.getElementById('study-modal')?.classList.remove('hidden');
  renderStudyList();
  if (!studyState.loaded && !studyState.loading) {
    loadStudyTests();
  }
}

function closeStudyModal() {
  document.body.classList.remove('study-modal-open');
  document.body.classList.remove('app-surface-open');
  document.getElementById('study-modal')?.classList.add('hidden');
}

function loadStudyTests() {
  studyState.loading = true;
  studyState.error = '';
  renderStudyList();

  fetch('policy_tests.json')
    .then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить policy_tests.json');
      return response.json();
    })
    .then((data) => {
      studyState.items = Array.isArray(data) ? data : [];
      studyState.loaded = true;
      studyState.loading = false;
      renderStudyList();
    })
    .catch((error) => {
      studyState.error = error.message || 'Ошибка загрузки тестов';
      studyState.loading = false;
      renderStudyList();
    });
}

function renderStudyList() {
  const container = document.getElementById('study-list');
  if (!container) return;

  if (studyState.loading) {
    container.innerHTML = `
      <div class="history-empty">Загрузка тестов...</div>
    `;
    return;
  }

  if (studyState.error) {
    container.innerHTML = `
      <div class="history-empty">
        <div>Не получилось открыть раздел изучения тестов.</div>
        <div class="study-error">${escapeHtml(studyState.error)}</div>
        <button class="main study-retry" id="study-retry-btn">Повторить</button>
      </div>
    `;
    document.getElementById('study-retry-btn')?.addEventListener('click', loadStudyTests);
    return;
  }

  if (!studyState.items.length) {
    container.innerHTML = `
      <div class="history-empty">В файле policy_tests.json пока нет тестов.</div>
    `;
    return;
  }

  container.innerHTML = studyState.items.map((item, index) => {
    const options = Array.isArray(item?.options) ? item.options : [];
    const answerIndex = Number(item?.answer);
    const safeQuestion = escapeHtml(item?.question || `Вопрос ${index + 1}`);

    return `
      <div class="study-card">
        <div class="study-question-row">
          <span class="answer-number">${index + 1}</span>
          <div class="study-question-text">${safeQuestion}</div>
        </div>
        <div class="study-options">
          ${options.map((option, optionIndex) => `
            <div class="study-option ${optionIndex === answerIndex ? 'correct' : ''}">
              <span class="study-option-letter">${String.fromCharCode(1040 + optionIndex)}.</span>
              <span>${escapeHtml(option)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function initHistoryUi(options = {}) {
  if (historyUiReady) return;
  historyUiReady = true;

  const withButton = options.withButton === true;
  let button = null;

  if (withButton) {
    button = document.createElement('button');
    button.id = 'history-toggle';
    button.className = 'history-toggle';
    button.textContent = 'История';
  }

  const modal = document.createElement('div');
  modal.id = 'history-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-panel">
      <div class="history-panel-header">
        <div>
          <div class="history-title">История прохождений</div>
          <div class="history-subtitle">Дата, длительность, счёт, ID и подробные ответы</div>
        </div>
        <button id="history-close" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <div id="history-list" class="history-list"></div>
    </div>
  `;

  if (button) document.body.appendChild(button);
  document.body.appendChild(modal);

  button?.addEventListener('click', openHistoryModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeHistoryModal();
  });
  modal.querySelector('#history-close')?.addEventListener('click', closeHistoryModal);

  const historyList = modal.querySelector('#history-list');
  historyList?.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'toggle') toggleHistoryDetails(id);
    if (action === 'delete') deleteHistoryEntry(id);
    if (action === 'download') downloadHistoryEntry(id);
  });
}

function openHistoryModal() {
  renderHistoryList();
  document.body.classList.add('history-modal-open');
  document.body.classList.add('app-surface-open');
  document.getElementById('history-modal')?.classList.remove('hidden');
}

function closeHistoryModal() {
  document.body.classList.remove('history-modal-open');
  document.body.classList.remove('app-surface-open');
  document.getElementById('history-modal')?.classList.add('hidden');
}

function initAppMenuUi() {
  if (appMenuUiReady || isTestPage) return;
  appMenuUiReady = true;

  const toggle = document.createElement('button');
  toggle.id = 'app-menu-toggle';
  toggle.className = 'app-menu-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Открыть меню');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  const overlay = document.createElement('div');
  overlay.id = 'app-menu-overlay';
  overlay.className = 'app-menu-overlay hidden';
  overlay.innerHTML = `
    <aside class="app-drawer">
      <div class="app-drawer-header">
        <div>
          <div class="app-drawer-title">Меню</div>
          <div class="app-drawer-subtitle">Переходы и быстрые действия</div>
        </div>
        <button id="app-menu-close" class="app-drawer-close" type="button" aria-label="Закрыть меню">×</button>
      </div>
      <div id="app-menu-list" class="app-menu-list"></div>
    </aside>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(overlay);

  toggle.addEventListener('click', openAppMenu);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAppMenu();
  });
  overlay.querySelector('#app-menu-close')?.addEventListener('click', closeAppMenu);

  renderAppMenuItems();
}

function openAppMenu() {
  document.getElementById('app-menu-overlay')?.classList.remove('hidden');
  document.body.classList.add('app-menu-open');
}

function closeAppMenu() {
  document.getElementById('app-menu-overlay')?.classList.add('hidden');
  document.body.classList.remove('app-menu-open');
}

function normalizeMenuPath(pathname) {
  const clean = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+/g, '/');

  if (!clean) return '/index.html';

  let normalized = clean;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (normalized.endsWith('/')) normalized += 'index.html';

  return normalized.toLowerCase();
}

function getMenuItemPath(href) {
  try {
    return normalizeMenuPath(new URL(String(href || ''), window.location.href).pathname);
  } catch (error) {
    return normalizeMenuPath(String(href || ''));
  }
}

function getSharedAppMenuActions() {
  return APP_MENU_ITEMS.filter(item => item && item.type === 'action');
}

function getTopLevelAppMenuItems() {
  return APP_MENU_ITEMS.filter(item => item && item.type !== 'action');
}

function getMenuItemSignature(item) {
  if (!item) return '';
  return JSON.stringify({
    type: item.type || '',
    label: item.label || '',
    href: item.href || '',
    action: item.action || ''
  });
}

function getUniqueMenuItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(item => {
    const signature = getMenuItemSignature(item);
    if (!signature || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function getActiveAppMenuChildren(item, isActive) {
  if (!isActive) return [];

  const localChildren = Array.isArray(item?.children) ? item.children.filter(Boolean) : [];
  const sharedActions = getSharedAppMenuActions();
  return getUniqueMenuItems([...localChildren, ...sharedActions]);
}

function renderStandaloneAppMenuActions(container) {
  const sharedActions = getSharedAppMenuActions();
  if (!container || !sharedActions.length) return;

  const html = sharedActions.map((item, index) => {
    const description = item.description ? `<div class="app-menu-item-desc">${escapeHtml(item.description)}</div>` : '';
    const key = `standalone-${index}`;
    appMenuActionMap.set(key, item);

    return `
      <button
        class="app-menu-item app-menu-item-standalone"
        type="button"
        data-menu-key="${key}"
      >
        <div class="app-menu-item-label-row">
          <span class="app-menu-item-label">${escapeHtml(item.label || 'Без названия')}</span>
        </div>
        ${description}
      </button>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderAppMenuItems() {
  const container = document.getElementById('app-menu-list');
  if (!container) return;

  appMenuActionMap = new Map();

  const currentPath = normalizeMenuPath(window.location.pathname);
  const topLevelItems = getTopLevelAppMenuItems();

  if (!topLevelItems.length) {
    renderStandaloneAppMenuActions(container);
  } else {
    const hasActiveLink = topLevelItems.some(item => {
      if (item.type !== 'link' || !item.href) return false;
      return getMenuItemPath(String(item.href || '')) === currentPath;
    });

    container.innerHTML = topLevelItems.map((item, index) => {
      const description = item.description ? `<div class="app-menu-item-desc">${escapeHtml(item.description)}</div>` : '';
      const isLink = item.type === 'link';
      const href = String(item.href || '');
      const itemPath = getMenuItemPath(href);
      const isActive = isLink && itemPath === currentPath;
      const children = getActiveAppMenuChildren(item, isActive);
      const topKey = `top-${index}`;
      appMenuActionMap.set(topKey, item);

      const childrenHtml = isActive && children.length
        ? `
          <div class="app-menu-children">
            ${children.map((child, childIndex) => {
              const childDescription = child.description ? `<div class="app-menu-subitem-desc">${escapeHtml(child.description)}</div>` : '';
              const childKey = `child-${index}-${childIndex}`;
              appMenuActionMap.set(childKey, child);
              return `
                <button
                  class="app-menu-subitem"
                  type="button"
                  data-menu-key="${childKey}"
                >
                  <div class="app-menu-subitem-label">${escapeHtml(child.label || 'Без названия')}</div>
                  ${childDescription}
                </button>
              `;
            }).join('')}
          </div>
        `
        : '';

      return `
        <div class="app-menu-card ${isActive ? 'active' : ''}">
          <button
            class="app-menu-item ${isActive ? 'active is-current' : ''}"
            type="button"
            data-menu-key="${topKey}"
          >
            <div class="app-menu-item-label-row">
              <span class="app-menu-item-label">${escapeHtml(item.label || 'Без названия')}</span>
              ${isActive ? '<span class="app-menu-item-badge">Сейчас</span>' : ''}
            </div>
            ${description}
          </button>
          ${childrenHtml}
        </div>
      `;
    }).join('');

    if (!hasActiveLink) {
      container.insertAdjacentHTML('beforeend', '<div class="app-menu-standalone-actions"></div>');
      renderStandaloneAppMenuActions(container.querySelector('.app-menu-standalone-actions'));
    }
  }

  container.querySelectorAll('[data-menu-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = appMenuActionMap.get(button.dataset.menuKey || '');
      if (!item) return;
      handleAppMenuItemClick(item);
    });
  });
}

function handleAppMenuItemClick(item) {
  if (!item) return;

  if (item.type === 'action') {
    closeAppMenu();

    if (item.action === 'study') {
      openStudyModal();
      return;
    }

    if (item.action === 'history') {
      openHistoryModal();
      return;
    }

    if (typeof item.onClick === 'function') {
      item.onClick();
    }
    return;
  }

  if (item.type === 'link' && item.href) {
    const itemPath = getMenuItemPath(String(item.href || ''));
    const currentPath = normalizeMenuPath(window.location.pathname);

    if (itemPath === currentPath) {
      return;
    }

    navigateWithLoader(item.href, { label: item.label ? `Открываем: ${item.label}` : 'Загружаем раздел' });
  }
}

function toggleHistoryDetails(id) {
  const details = document.querySelector(`.history-details[data-id="${CSS.escape(id)}"]`);
  const actionBtn = document.querySelector(`button[data-action="toggle"][data-id="${CSS.escape(id)}"]`);
  if (!details || !actionBtn) return;

  details.classList.toggle('hidden');
  actionBtn.textContent = details.classList.contains('hidden') ? 'Открыть' : 'Скрыть';
}

function deleteHistoryEntry(id) {
  const history = getHistory();
  const nextHistory = history.filter(item => item.id !== id);
  saveHistory(nextHistory);
  renderHistoryList();
}

function downloadHistoryEntry(id) {
  const history = getHistory();
  const entry = history.find(item => item.id === id);
  if (!entry) return;

  downloadTextFile(
    `history-${QUIZ_STORAGE_NAMESPACE}-${entry.id}.json`,
    JSON.stringify(entry, null, 2)
  );
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const history = getHistory().sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!history.length) {
    container.innerHTML = `
      <div class="history-empty">
        История пока пустая. После завершения теста здесь появятся все попытки.
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(entry => {
    const suspiciousCount = entry.cheatLog?.length || 0;
    const detailsHtml = (entry.answers || []).map((answer, index) => {
      const selectedText = answer.timeout
        ? 'Не выбрано — время вышло'
        : (answer.selectedText ?? 'Не выбрано');
      const statusText = answer.timeout
        ? 'Время вышло'
        : answer.isCorrect
          ? 'Правильно'
          : 'Неправильно';
      const statusClass = answer.timeout ? 'timeout' : (answer.isCorrect ? 'ok' : 'bad');

      return `
        <div class="answer-card">
          <div class="answer-card-top">
            <span class="answer-number">${index + 1}</span>
            <span class="answer-status ${statusClass}">${statusText}</span>
          </div>
          <div class="answer-question">${escapeHtml(answer.question)}</div>
          <div class="answer-line"><b>Выбрано:</b> ${escapeHtml(selectedText)}</div>
          <div class="answer-line"><b>Правильный:</b> ${escapeHtml(answer.correctText ?? '—')}</div>
        </div>
      `;
    }).join('');

    const cheatHtml = suspiciousCount
      ? `
        <div class="cheat-log">
          <div class="cheat-log-title">Подозрительные действия</div>
          ${(entry.cheatLog || []).map(log => `
            <div class="cheat-log-item">${escapeHtml(log.label)} — ${escapeHtml(log.atLabel)}</div>
          `).join('')}
        </div>
      `
      : `<div class="cheat-log clean">Подозрительных действий не обнаружено</div>`;

    return `
      <div class="history-item">
        <div class="history-item-head">
          <div class="history-summary">
            <div class="history-id">${escapeHtml(entry.id)}</div>
            <div class="history-meta">
              <span>📅 ${escapeHtml(entry.finishedAtLabel || formatDateTimeToMinute(entry.finishedAt))}</span>
              <span>⏳ ${escapeHtml(entry.durationLabel || formatDuration(entry.durationSeconds))}</span>
              <span>✅ ${entry.score}/${entry.totalQuestions}</span>
              <span>📚 ${escapeHtml(entry.themeLabel || getThemeLabel(entry.themeFile))}</span>
              <span>⚠️ ${suspiciousCount}</span>
            </div>
          </div>
          <div class="history-actions">
            <button data-action="toggle" data-id="${escapeHtml(entry.id)}">Открыть</button>
            <button data-action="download" data-id="${escapeHtml(entry.id)}">Скачать</button>
            <button data-action="delete" data-id="${escapeHtml(entry.id)}" class="danger">Удалить</button>
          </div>
        </div>
        <div class="history-details hidden" data-id="${escapeHtml(entry.id)}">
          <div class="history-detail-grid">
            <div><b>ID теста:</b> ${escapeHtml(entry.id)}</div>
            <div><b>Начало:</b> ${escapeHtml(entry.startedAtLabel || formatDateTimeToMinute(entry.startedAt))}</div>
            <div><b>Окончание:</b> ${escapeHtml(entry.finishedAtLabel || formatDateTimeToMinute(entry.finishedAt))}</div>
            <div><b>Всего вопросов:</b> ${entry.totalQuestions}</div>
          </div>
          ${cheatHtml}
          <div class="answers-list">${detailsHtml}</div>
        </div>
      </div>
    `;
  }).join('');
}

function logCheatEvent(type, label) {
  if (!isTestPage || !session || session.review || session.finished) return;
  session.cheatLog = session.cheatLog || [];

  const now = Date.now();
  const last = session.cheatLog[session.cheatLog.length - 1];
  if (last && last.type === type && now - last.at < 1500) return;

  session.cheatLog.push({
    type,
    label,
    at: now,
    atLabel: formatDateTimeToSecond(now)
  });

  saveActiveSessionSnapshot();
}

function saveActiveSessionSnapshot() {
  if (!session) return;
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      id: session.id,
      startedAt: session.start,
      index: session.index,
      score: session.score,
      cheatLog: session.cheatLog || []
    }));
  } catch {
    // ничего
  }
}

function clearActiveSessionSnapshot() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

function persistFinishedSession() {
  if (!session || session.saved) return;

  const finishedAt = Date.now();
  const totalQuestions = tests.length;
  const durationSeconds = Math.max(1, Math.round((finishedAt - session.start) / 1000));
  const historyId = generateHistoryId(session.start);

  const entry = {
    id: historyId,
    minuteSeed: getMinuteSeed(session.start),
    startedAt: session.start,
    startedAtLabel: formatDateTimeToMinute(session.start),
    finishedAt,
    finishedAtLabel: formatDateTimeToMinute(finishedAt),
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    score: session.score,
    totalQuestions,
    themeFile: session.themeFile,
    themeLabel: getThemeLabel(session.themeFile),
    cheatLog: session.cheatLog || [],
    answers: tests.map((question, index) => {
      const answerState = session.answers[index] || {};
      const selectedIndex = Number.isInteger(answerState.selected) ? answerState.selected : null;
      const correctIndex = question.answer;
      const timeout = !!answerState.timeout;
      return {
        questionIndex: index + 1,
        question: question.question,
        selectedIndex,
        selectedText: selectedIndex !== null ? question.options[selectedIndex] : null,
        correctIndex,
        correctText: question.options[correctIndex],
        isCorrect: !timeout && selectedIndex === correctIndex,
        timeout,
        options: [...question.options]
      };
    })
  };

  const history = getHistory();
  history.push(entry);
  saveHistory(history);

  session.saved = true;
  session.finished = true;
  session.id = historyId;
  clearActiveSessionSnapshot();
}

function attachSuspiciousActivityTracking() {
  if (!isTestPage) return;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logCheatEvent('visibility_hidden', 'Скрытие вкладки / переход в другое приложение');
    }
  });

  window.addEventListener('blur', () => {
    logCheatEvent('window_blur', 'Потеря фокуса окна');
  });

  window.addEventListener('beforeunload', () => {
    if (!session || session.review || session.finished) return;
    logCheatEvent('before_unload', 'Попытка покинуть страницу во время теста');
  });
}

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
initAgreementUi();

if (!isTestPage) {
  initStudyUi({ withButton: false });
  initHistoryUi({ withButton: false });
  initAppMenuUi();
}

if (!isTestPage && app) {
  renderMenu();
}

enforceAgreementOnEntry();

if (isTestPage && isAgreementAccepted()) {
  attachSuspiciousActivityTracking();
  startTest();
}

// ==========================================
// ЛОГИКА ДЛЯ МЕНЮ (INDEX.HTML)
// ==========================================
function renderMenu() {
  app.innerHTML = `
<div class="card">
    <div class="author">Created by Sayfiddinov</div>
    <h2>Добро пожаловать 👋</h2>
    <p><b>Экономическая политика</b></p>

    <label>📚 Выберите тему</label>
    <div class="row">
        <select id="theme-select">
            <option value="iqtisodiy_siyosat_tests_part_1.json">Вопросы 1-50</option>
            <option value="iqtisodiy_siyosat_tests_part_2.json">Вопросы 51-100</option>
            <option value="iqtisodiy_siyosat_tests_part_3.json">Вопросы 101-150</option>
            <option value="iqtisodiy_siyosat_tests_part_4.json">Вопросы 151-200</option>
            <option value="iqtisodiy_siyosat_tests_part_5.json">Вопросы 201-250</option>
            <option value="iqtisodiy_siyosat_tests_part_6.json">Вопросы 251-304</option>
            <option value="policy_tests.json" selected>Все вопросы (Микс)</option>
        </select>
    </div>

    <label>⏱ Время на вопрос (сек)</label>
    <div class="row">
        <select id="preset-timer">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30" selected>30</option>
            <option value="60">60</option>
        </select>
        <input id="custom-timer" type="number" min="5" placeholder="своё">
    </div>

    <label>📝 Количество вопросов</label>
    <div class="row">
        <select id="preset-count">
            <option value="1000000000" selected>Все вопросы</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="30">30</option>
            <option value="35">35</option>
            <option value="50">50</option>
        </select>
        <input id="custom-count" type="number" min="1" placeholder="своё">
    </div>

    <button class="main" id="startBtn">Начать тест</button>
</div>`;

  document.getElementById('startBtn').onclick = () => {
    if (!isAgreementAccepted()) {
      showAgreementOverlay();
      return;
    }

    localStorage.setItem(TIMER_KEY, getTimerValue());
    localStorage.setItem(QUESTION_COUNT_KEY, getQuestionsCount());
    localStorage.setItem(THEME_FILE_KEY, getSelectedTheme());
    navigateWithLoader('policy_test.html', { label: 'Подготавливаем тест' });
  };
}

// ==========================================
// ЛОГИКА ДЛЯ ТЕСТА (TEST.HTML)
// ==========================================
function startTest() {
  timeLimit = parseInt(localStorage.getItem(TIMER_KEY), 10) || 30;
  const countLimit = parseInt(localStorage.getItem(QUESTION_COUNT_KEY), 10) || 15;
  const themeFile = localStorage.getItem(THEME_FILE_KEY) || 'policy_tests.json';

  session = {
    id: null,
    start: Date.now(),
    index: 0,
    score: 0,
    review: false,
    finished: false,
    saved: false,
    themeFile,
    answers: [],
    cheatLog: []
  };

  saveActiveSessionSnapshot();

  fetch(themeFile)
    .then(r => {
      if (!r.ok) throw new Error('Файл темы не найден');
      return r.json();
    })
    .then(data => {
      const selectedQuestions = selectRandomQuestions(data, countLimit, themeFile);

      tests = selectedQuestions.map(q => {
        const originalAnswerIndex = Number(q.answer);
        const correctText = q.options[originalAnswerIndex];
        const shuffledOptions = shuffleArray(q.options);
        const newAnswerIndex = shuffledOptions.indexOf(correctText);
        return { ...q, options: shuffledOptions, answer: newAnswerIndex };
      });

      showQuestion();
    })
    .catch(err => {
      alert('Ошибка загрузки теста: ' + err.message);
      navigateWithLoader('policy_index.html', { label: 'Возвращаемся в меню' });
    });
}

function showQuestion() {
  clearInterval(timer);
  selected = null;

  const q = tests[session.index];
  if (!q) return finish();

  const state = session.answers[session.index] || { selected: null, answered: false, timeout: false };
  selected = state.selected;

  const qContainer = document.getElementById('question');
  const optionsEl = document.getElementById('options');

  if (!qContainer || !optionsEl) return;

  qContainer.innerHTML = `
    <div class="progress">
      ${session.review ? `Просмотр ${session.index + 1} / ${tests.length}` : `Вопрос ${session.index + 1} из ${tests.length}`}
    </div>
    <div>${escapeHtml(q.question)}</div>
  `;

  optionsEl.innerHTML = '';
  let confirmBtn = null;

  q.options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = text;

    if (state.answered || state.timeout || session.review) {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      if (state.selected !== null && i === state.selected && i !== q.answer) btn.classList.add('wrong');
    } else {
      btn.onclick = () => {
        selected = i;
        optionsEl.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (confirmBtn) confirmBtn.disabled = false;
      };
      if (i === selected) btn.classList.add('selected');
    }

    optionsEl.appendChild(btn);
  });

  if (!state.answered && !state.timeout && !session.review) {
    confirmBtn = document.createElement('button');
    confirmBtn.className = 'main';
    confirmBtn.textContent = 'Ответить';
    confirmBtn.disabled = selected === null;
    confirmBtn.onclick = () => confirmAnswer(false);
    optionsEl.appendChild(confirmBtn);
    startTimer();
  } else {
    const t = document.getElementById('timer');
    if (t) t.textContent = session.review ? '📋 Режим просмотра' : '⏱ Ответ зафиксирован';
  }

  renderNavButtons();
}

function startTimer() {
  timeLeft = timeLimit;
  const t = document.getElementById('timer');
  if (!t) return;

  t.textContent = `⏱ ${timeLeft}`;
  t.className = 'timer';
  t.classList.remove('warning');

  timer = setInterval(() => {
    timeLeft--;
    t.textContent = `⏱ ${timeLeft}`;
    if (timeLeft <= 5) t.classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timer);
      confirmAnswer(true);
    }
  }, 1000);
}

function confirmAnswer(fromTimer) {
  clearInterval(timer);
  const q = tests[session.index];

  session.answers[session.index] = {
    selected: fromTimer ? null : selected,
    answered: !fromTimer,
    timeout: fromTimer
  };

  if (!fromTimer && selected === q.answer) session.score++;
  saveActiveSessionSnapshot();
  showQuestion();
}

function renderNavButtons() {
  const optionsEl = document.getElementById('options');
  let nav = document.querySelector('.nav-buttons');

  if (!nav) {
    nav = document.createElement('div');
    nav.className = 'nav-buttons';
    optionsEl.appendChild(nav);
  }

  nav.innerHTML = '';
  const state = session.answers[session.index];
  const isLast = session.index === tests.length - 1;

  if (session.index > 0 && (state?.answered || state?.timeout || session.review)) {
    const prev = document.createElement('button');
    prev.textContent = '←';
    prev.onclick = () => {
      session.index--;
      showQuestion();
    };
    nav.appendChild(prev);
  }

  if (state && !isLast) {
    const next = document.createElement('button');
    next.textContent = '→';
    next.onclick = () => {
      session.index++;
      showQuestion();
    };
    nav.appendChild(next);
  }

  if (state && isLast && !session.review) {
    const finishBtn = document.createElement('button');
    finishBtn.className = 'main';
    finishBtn.textContent = 'Завершить тест';
    finishBtn.onclick = finish;
    nav.appendChild(finishBtn);
  }
}

function finish() {
  clearInterval(timer);
  persistFinishedSession();

  const card = document.querySelector('.card');
  if (!card) return;

  card.innerHTML = `
    <h2>Тест завершён</h2>
    <p>👤 Гость</p>
    <p>🆔 ${escapeHtml(session.id || '—')}</p>
    <p>📅 ${escapeHtml(formatDateTimeToMinute(Date.now()))}</p>
    <p>✅ ${session.score}/${tests.length}</p>
    <button class="main" onclick="startReview()">📋 Просмотреть ответы</button>
    <button class="main" onclick="openHistoryModal()">🕘 Открыть историю</button>
    <button class="main" onclick=\"navigateWithLoader('index.html', { label: 'Возвращаемся в меню' })\">🏠 В главное меню</button>
  `;
}

function startReview() {
  session.review = true;
  session.index = 0;

  const card = document.querySelector('.card');
  if (!card) return;

  card.innerHTML = `<div id="timer"></div><div id="question"></div><div id="options"></div>`;
  showQuestion();
}
