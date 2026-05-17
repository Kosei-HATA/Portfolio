const resume = document.getElementById("resume");
const langJa = document.getElementById("langJa");
const langEn = document.getElementById("langEn");

const STORAGE_KEY = "cv-language";
const SUPPORTED_LANGUAGES = ["ja", "en"];
const MARKDOWN_FILES = {
  ja: ["content.md"],
  en: ["content-en.md"]
};
const UI_TEXT = {
  ja: {
    loading: "読み込み中...",
    parserError: "Markdownパーサの読み込みに失敗しました。",
    localServerError:
      "ローカルで index.html を直接開くとMarkdownを読み込めません。`python3 -m http.server` などでローカルサーバーを起動して開いてください。",
    fetchError: "Markdownファイルの読み込みに失敗しました。"
  },
  en: {
    loading: "Loading...",
    parserError: "Failed to load Markdown parser.",
    localServerError:
      "Opening index.html directly via file:// cannot load Markdown files. Start a local server such as `python3 -m http.server`.",
    fetchError: "Failed to load Markdown file."
  }
};

const getInitialLanguage = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }
  return "ja";
};

let currentLanguage = getInitialLanguage();

const renderError = (message) => {
  if (!resume) return;
  resume.innerHTML = `<p class="error">${message}</p>`;
};

const renderLoading = (language) => {
  if (!resume) return;
  resume.innerHTML = `<p class="loading">${UI_TEXT[language].loading}</p>`;
};

const markdownCandidates = (language) => {
  const files = MARKDOWN_FILES[language] ?? MARKDOWN_FILES.ja;
  const baseDir = new URL(".", window.location.href);
  return [...new Set(files.flatMap((file) => [new URL(file, baseDir).toString(), `./${file}`, file]))];
};

const fetchMarkdown = async (language) => {
  let lastError;

  for (const path of markdownCandidates(language)) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) {
        return await response.text();
      }
      lastError = new Error(`${UI_TEXT[language].fetchError} (${response.status})`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(UI_TEXT[language].fetchError);
};

const updateLanguageButtons = () => {
  const buttons = [langJa, langEn];
  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const isActive = button.dataset.lang === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const loadMarkdownCv = async (language) => {
  if (!resume) return;
  renderLoading(language);

  if (!window.marked) {
    renderError(UI_TEXT[language].parserError);
    return;
  }

  try {
    const markdown = await fetchMarkdown(language);
    const html = window.marked.parse(markdown, {
      gfm: true,
      breaks: true
    });
    resume.innerHTML = html;
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);

    const title = resume.querySelector("h1");
    if (title?.textContent) {
      document.title = `${title.textContent} | Resume`;
    }
  } catch (error) {
    if (window.location.protocol === "file:") {
      renderError(UI_TEXT[language].localServerError);
      return;
    }

    renderError(`${error instanceof Error ? error.message : UI_TEXT[language].fetchError}`);
  }
};

const switchLanguage = (language) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) return;
  currentLanguage = language;
  updateLanguageButtons();
  void loadMarkdownCv(language);
};

if (langJa instanceof HTMLButtonElement) {
  langJa.addEventListener("click", () => switchLanguage("ja"));
}

if (langEn instanceof HTMLButtonElement) {
  langEn.addEventListener("click", () => switchLanguage("en"));
}

updateLanguageButtons();
void loadMarkdownCv(currentLanguage);
