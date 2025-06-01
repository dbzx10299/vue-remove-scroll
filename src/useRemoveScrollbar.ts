import { computed } from 'vue'

interface GapOffset {
  left: number;
  top: number;
  right: number;
  gap: number;
}

interface Options {
  noRelative?: boolean;
  noImportant?: boolean;
  gapMode?: 'padding' | 'margin';
}

const zeroRightClassName = 'right-scroll-bar-position';
const fullWidthClassName = 'width-before-scroll-bar';
const noScrollbarsClassName = 'with-scroll-bars-hidden';
const removedBarSizeVariable = '--removed-body-scroll-bar-size';


function getOffset(gapMode: 'padding' | 'margin'): number[] {
  const {
    paddingLeft,
    paddingTop,
    paddingRight,
    marginLeft,
    marginTop,
    marginRight
  } = window.getComputedStyle(document.body)

  const values = {
    padding: [paddingLeft, paddingTop, paddingRight],
    margin: [marginLeft, marginTop, marginRight]
  };

  return values[gapMode].map(value => Number.parseInt(value, 10))
}


function getGapWidth(gapMode: 'padding' | 'margin' = 'margin'): GapOffset {
  const [left, top, right] = getOffset(gapMode)
  const documentWidth = document.documentElement.clientWidth;
  const windowWidth = window.innerWidth;

  return {
    left,
    top,
    right,
    gap: Math.max(0, windowWidth - documentWidth + right - left)
  }
}


const lockAttribute = 'data-scroll-locked';

function getStyles(
  { left, top, right, gap }: GapOffset,
  allowRelative: boolean,
  gapMode: 'padding' | 'margin' = 'margin',
  important: string
) {
  return (`
  .${noScrollbarsClassName} {
    overflow: hidden ${important};
    padding-right: ${gap}px ${important};
  }

  body[${lockAttribute}] {
    overflow: hidden ${important};
    overscroll-behavior: contain;
    ${[
      allowRelative && `position: relative ${important};`,
      gapMode === 'margin' &&
        `
    padding-left: ${left}px;
    padding-top: ${top}px;
    padding-right: ${right}px;
    margin-left:0;
    margin-top:0;
    margin-right: ${gap}px ${important};
    `,
      gapMode === 'padding' && `padding-right: ${gap}px ${important};`,
    ]
      .filter(Boolean)
      .join('')}
  }

  .${zeroRightClassName} {
    right: ${gap}px ${important};
  }
  
  .${fullWidthClassName} {
    margin-right: ${gap}px ${important};
  }
  
  .${zeroRightClassName} .${zeroRightClassName} {
    right: 0 ${important};
  }
  
  .${fullWidthClassName} .${fullWidthClassName} {
    margin-right: 0 ${important};
  }
  
  body[${lockAttribute}] {
    ${removedBarSizeVariable}: ${gap}px;
  }
  `)
}


export function useRemoveScrollbar({ noRelative, noImportant, gapMode = 'margin' }: Options) {
  let count = 0
  const styleTag = document.createElement('style')
  const gap = computed(() => getGapWidth(gapMode));
  styleTag.textContent = getStyles(gap.value, !noRelative, gapMode, !noImportant ? '!important' : '')
  document.head.appendChild(styleTag)

  function hideScrollbar() {
    document.body.setAttribute(lockAttribute, (count + 1).toString())
  }

  function showScrollbar() {
    const newCount = count - 1

    if (newCount <= 0) {
      document.body.removeAttribute(lockAttribute)
      styleTag?.remove()
      return
    }

    document.body.setAttribute(lockAttribute, count.toString())
  }

  return { hideScrollbar, showScrollbar }
}