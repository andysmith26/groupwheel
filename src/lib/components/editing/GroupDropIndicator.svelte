<script lang="ts">
  /**
   * Visual indicator showing where a dragged group column will be inserted.
   * Renders as a thin vertical line with a circle at the top end.
   * Uses absolute positioning so it never displaces surrounding items.
   */
  const { visible = false, edge = 'left' } = $props<{
    visible?: boolean;
    edge?: 'left' | 'right';
  }>();
</script>

<div
  class="group-drop-indicator"
  class:group-drop-indicator--visible={visible}
  class:group-drop-indicator--left={edge === 'left'}
  class:group-drop-indicator--right={edge === 'right'}
>
  <div class="group-drop-indicator-circle"></div>
  <div class="group-drop-indicator-line"></div>
</div>

<style>
  .group-drop-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 4px;
    pointer-events: none;
    opacity: 0;
    z-index: 10;
  }

  .group-drop-indicator--visible {
    opacity: 1;
  }

  .group-drop-indicator--left {
    left: -10px;
  }

  .group-drop-indicator--right {
    right: -10px;
  }

  .group-drop-indicator-circle {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #3b82f6;
    flex-shrink: 0;
  }

  .group-drop-indicator-line {
    flex: 1;
    width: 2px;
    background-color: #3b82f6;
    border-radius: 1px;
  }
</style>
