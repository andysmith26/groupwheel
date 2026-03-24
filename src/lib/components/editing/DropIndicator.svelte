<script lang="ts">
  /**
   * Visual indicator showing where a dragged item will be inserted.
   * Horizontal edges (top/bottom): thin horizontal line with a circle at the left end.
   * Vertical edges (left/right): thin vertical line with a circle at the top end.
   * Uses absolute positioning so it never displaces surrounding items.
   */
  const { visible = false, edge = 'top' } = $props<{
    visible?: boolean;
    edge?: 'top' | 'bottom' | 'left' | 'right';
  }>();

  const isVertical = $derived(edge === 'left' || edge === 'right');
</script>

<div
  class="drop-indicator"
  class:drop-indicator--visible={visible}
  class:drop-indicator--top={edge === 'top'}
  class:drop-indicator--bottom={edge === 'bottom'}
  class:drop-indicator--left={edge === 'left'}
  class:drop-indicator--right={edge === 'right'}
  class:drop-indicator--vertical={isVertical}
>
  <div class="drop-indicator-circle"></div>
  <div class="drop-indicator-line"></div>
</div>

<style>
  .drop-indicator {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    height: 4px;
    width: 100%;
    pointer-events: none;
    opacity: 0;
    z-index: 50;
    filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.6));
  }

  .drop-indicator--vertical {
    /* Switch to vertical layout */
    top: -4px;
    bottom: -4px;
    left: auto;
    right: auto;
    flex-direction: column;
    width: 4px;
    height: calc(100% + 8px);
  }

  .drop-indicator--visible {
    opacity: 1;
  }

  .drop-indicator--top {
    top: -3px;
  }

  .drop-indicator--bottom {
    bottom: -3px;
  }

  .drop-indicator--left {
    /* Center in the grid gap to the left of this card */
    left: calc(-1 * (var(--card-gap, 8px) / 2) - 2px);
  }

  .drop-indicator--right {
    /* Center in the grid gap to the right of this card */
    right: calc(-1 * (var(--card-gap, 8px) / 2) - 2px);
  }

  .drop-indicator-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #3b82f6;
    flex-shrink: 0;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
  }

  .drop-indicator-line {
    flex: 1;
    height: 3px;
    background-color: #3b82f6;
    border-radius: 1.5px;
  }

  .drop-indicator--vertical .drop-indicator-line {
    height: auto;
    width: 3px;
  }
</style>
