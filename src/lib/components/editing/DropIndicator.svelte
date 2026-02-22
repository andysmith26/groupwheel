<script lang="ts">
  /**
   * Visual indicator showing where a dragged item will be inserted.
   * Renders as a thin horizontal line with a circle at the left end.
   * Uses absolute positioning so it never displaces surrounding items.
   */
  const { visible = false, edge = 'top' } = $props<{
    visible?: boolean;
    edge?: 'top' | 'bottom';
  }>();
</script>

<div
  class="drop-indicator"
  class:drop-indicator--visible={visible}
  class:drop-indicator--top={edge === 'top'}
  class:drop-indicator--bottom={edge === 'bottom'}
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
    z-index: 10;
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

  .drop-indicator-circle {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #3b82f6;
    flex-shrink: 0;
  }

  .drop-indicator-line {
    flex: 1;
    height: 2px;
    background-color: #3b82f6;
    border-radius: 1px;
  }
</style>
