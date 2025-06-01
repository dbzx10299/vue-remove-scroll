import { ref, toValue } from 'vue'
import type { Ref } from 'vue'
import { useRemoveScrollbar } from './useRemoveScrollbar.ts';
import { handleScroll, locationCouldBeScrolled } from './handleScroll.ts';

type Axis = 'v' | 'h';
type GapMode = 'padding' | 'margin';

interface RemoveScrollProps {
  noRelative?: boolean;
  gapMode?: GapMode;
  noIsolation?: boolean;
  allowPinchZoom?: boolean;
  excludedElements?: Array<Ref<HTMLElement> | HTMLElement>;
}

function getTouchXY(event: TouchEvent | WheelEvent) {
  return 'changedTouches' in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
}

function getDeltaXY(event: WheelEvent) {
  return [event.deltaX, event.deltaY];
}

function deltaCompare(x: number[], y: number[]) {
  return x[0] === y[0] && x[1] === y[1];
}

type ShouldPreventQueueItem = {
  name: string;
  delta: number[];
  target: any;
  should: boolean;
  shadowParent?: HTMLElement | null;
}

export function useRemoveScroll(props: RemoveScrollProps) {
  const shouldPreventQueue = ref<ShouldPreventQueueItem[]>([])
  const touchStartRef = ref([0, 0])
  const activeAxis = ref<Axis | undefined>()

  const {
    hideScrollbar,
    showScrollbar
  } = useRemoveScrollbar({
    noRelative: props?.noRelative,
    gapMode: props?.gapMode
  })

  function enableScroll() {
    hideScrollbar()
    document.addEventListener('wheel', shouldPrevent, { passive: false });
    document.addEventListener('touchmove', shouldPrevent, { passive: false });
    document.addEventListener('touchstart', scrollTouchStart, { passive: false });
  }

  function disableScroll() {
    showScrollbar()
    document.removeEventListener('wheel', shouldPrevent, { passive: false } as any);
    document.removeEventListener('touchmove', shouldPrevent, { passive: false } as any);
    document.removeEventListener('touchstart', scrollTouchStart, { passive: false } as any);
  }
  

  function shouldCancelEvent(event: WheelEvent | TouchEvent, parent: HTMLElement) {
    if (('touches' in event && event.touches.length === 2) || (event.type === 'wheel' && event.ctrlKey)) {
      return !props?.allowPinchZoom;
    }

    const touch = getTouchXY(event);
    const touchStart = touchStartRef.value;
    const deltaX = 'deltaX' in event ? event.deltaX : touchStart[0] - touch[0];
    const deltaY = 'deltaY' in event ? event.deltaY : touchStart[1] - touch[1];

    let currentAxis: Axis | undefined;
    const target: HTMLElement = event.target as any;

    const moveDirection: Axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'h' : 'v';

    // allow horizontal touch move on Range inputs. They will not cause any scroll
    if ('touches' in event && moveDirection === 'h' && (target as HTMLInputElement).type === 'range') {
      return false;
    }

    let canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);

    if (!canBeScrolledInMainDirection) {
      return true;
    }

    if (canBeScrolledInMainDirection) {
      currentAxis = moveDirection;
    } else {
      currentAxis = moveDirection === 'v' ? 'h' : 'v';
      canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
      // other axis might be not scrollable
    }

    if (!canBeScrolledInMainDirection) {
      return false;
    }

    if (!activeAxis.value && 'changedTouches' in event && (deltaX || deltaY)) {
      activeAxis.value = currentAxis;
    }

    if (!currentAxis) {
      return true;
    }

    const cancelingAxis = activeAxis.value || currentAxis;

    return handleScroll(cancelingAxis, parent, event, cancelingAxis === 'h' ? deltaX : deltaY, true);
  }

  function shouldPrevent(_event: Event) {
    const event: WheelEvent | TouchEvent = _event as any;

    const delta = 'deltaY' in event ? getDeltaXY(event) : getTouchXY(event);
    const sourceEvent = shouldPreventQueue.value.filter(
      (e) => e.name === event.type && (e.target === event.target || event.target === e.shadowParent) && deltaCompare(e.delta, delta)
    )[0];

    // self event, and should be canceled
    if (sourceEvent && sourceEvent.should) {
      if (event.cancelable) {
        event.preventDefault();
      }

      return;
    }

    // outside event
    if (!sourceEvent) {
      const excludedNodes = (props?.excludedElements || [])
        .map(toValue)
        .filter(Boolean)
        .filter((node) => node.contains(event.target as any));

      const shouldStop = excludedNodes.length > 0
        ? shouldCancelEvent(event, excludedNodes[0])
        : !props?.noIsolation;

      if (shouldStop) {
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    }
  }

  function scrollTouchStart(event: any) {
    touchStartRef.value = getTouchXY(event);
    activeAxis.value = undefined;
  }

  return { enableScroll, disableScroll }

}