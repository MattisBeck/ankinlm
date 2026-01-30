import { isFlashcardData, isQuizData } from './typeguards';

export const createStyledButton = (
  parentEl: Element,
  label: string,
  matIcon: string,
  classes?: string[],
  styles?: string[]
) => {
  const buttonWrapper = document.createElement('div');
  buttonWrapper.innerHTML = `<button style='${
    styles ? styles.join(' ') : ''
  } border-color: #37383B'
  _ngcontent-ng-c2304399035=""
  aria-label="Copy JSON"
  mat-stroked-button=""
  class="mdc-button mat-mdc-button-base feedback-button mdc-button--outlined mat-mdc-outlined-button mat-unthemed ${
    classes ? classes.join(' ') : ''
  }"
  mat-ripple-loader-class-name="mat-mdc-button-ripple"
>
  <span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span
  ><mat-icon
    _ngcontent-ng-c16875709=""
    role="img"
    aria-hidden="true"
    class="mat-icon notranslate material-symbols-outlined google-symbols mat-icon-no-color"
    data-mat-icon-type="font"
    >${matIcon}</mat-icon
  >${
    label.length
      ? `<span class="mdc-button__label">${label}</span><span class="mat-focus-indicator"></span>`
      : ''
  }<span class="mat-mdc-button-touch-target" style="cursor: pointer"></span
  ><span class="mat-ripple mat-mdc-button-ripple"></span>
</button>
`;
  const button = buttonWrapper.firstElementChild;
  if (!button) throw new Error('button creation failed');
  parentEl.appendChild(button);
  return button as HTMLElement;
};

export const createTsvBlob = (data: string): Blob | undefined => {
  const parsedData = JSON.parse(data);

  let rows: string[] = [];

  function normalizeMathJax(text: string) {
    if (!text) return text;
    let result = '';
    let i = 0;

    const mathSignalRegex = /\\[A-Za-z]+|[=<>^_+\-*/|{}\[\]()]/;
    const currencyRegex = /^[+-]?\d[\d\s.,]*(?:%|[kKmMbB])?$/;

    const shouldConvertInline = (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      if (currencyRegex.test(trimmed)) return false;
      if (mathSignalRegex.test(trimmed)) return true;
      return /[A-Za-z]/.test(trimmed);
    };

    const emit = (content: string, isDisplay: boolean) => {
      if (isDisplay) return `\\[${content}\\]`;
      if (shouldConvertInline(content)) return `\\(${content}\\)`;
      return `$${content}$`;
    };

    while (i < text.length) {
      const ch = text[i];
      if (ch === '\\') {
        if (i + 1 < text.length && text[i + 1] === '$') {
          result += '\\$';
          i += 2;
          continue;
        }
        result += ch;
        i += 1;
        continue;
      }

      if (ch === '$') {
        const isDisplay = i + 1 < text.length && text[i + 1] === '$';
        const start = i;
        let j = i + (isDisplay ? 2 : 1);

        while (j < text.length) {
          if (text[j] === '\\') {
            j += 2;
            continue;
          }
          if (text[j] === '$') {
            if (isDisplay) {
              if (j + 1 < text.length && text[j + 1] === '$') {
                const content = text.slice(i + 2, j);
                result += emit(content, true);
                i = j + 2;
                break;
              }
              j += 1;
              continue;
            }
            const content = text.slice(i + 1, j);
            result += emit(content, false);
            i = j + 1;
            break;
          }
          j += 1;
        }

        if (i === start) {
          result += '$';
          i += 1;
        }
        continue;
      }

      result += ch;
      i += 1;
    }

    return result;
  }

  function escapeTsvField(field: string) {
    const escaped = field.replace(/"/g, '""');
    if (/[\t\n"]/.test(escaped)) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  if (isFlashcardData(parsedData)) {
    for (const card of parsedData.flashcards) {
      const front = escapeTsvField(normalizeMathJax(card.f));
      const back = escapeTsvField(normalizeMathJax(card.b));
      rows.push(`${front}\t${back}`);
    }
  }

  if (isQuizData(parsedData)) {
    for (const quiz of parsedData.quiz) {
      const answer = quiz.answerOptions.find((opt) => opt.isCorrect);
      if (!answer) continue;
      const question = escapeTsvField(normalizeMathJax(quiz.question));
      const correct = escapeTsvField(normalizeMathJax(answer.text));
      rows.push(`${question}\t${correct}`);
    }
  }

  const tsv = rows.join('\n');
  const BOM = '\uFEFF'; // UTF-8
  return new Blob([BOM + tsv], { type: 'text/tab-separated-values;charset=utf-8' });
};
