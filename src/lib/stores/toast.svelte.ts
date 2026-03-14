/**
 * Global toast notification store.
 *
 * Provides a reactive queue of toast messages with auto-dismiss support.
 * Each toast has a variant, message, optional action, and configurable duration.
 */

export type ToastVariant = 'error' | 'warning' | 'info' | 'success';

export interface ToastAction {
	label: string;
	callback: () => void | Promise<void>;
}

export interface Toast {
	id: string;
	variant: ToastVariant;
	message: string;
	subtitle?: string;
	dismissible: boolean;
	/** Duration in ms before auto-dismiss. 0 = no auto-dismiss. */
	duration: number;
	action?: ToastAction;
}

type ToastInput = {
	variant?: ToastVariant;
	message: string;
	subtitle?: string;
	dismissible?: boolean;
	/** Duration in ms. Defaults vary by variant: error=8000, warning=5000, info/success=3000. 0 = sticky. */
	duration?: number;
	action?: ToastAction;
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
	error: 8000,
	warning: 5000,
	info: 3000,
	success: 3000
};

let nextId = 0;

function createId(): string {
	return `toast-${++nextId}-${Date.now()}`;
}

let toasts = $state<Toast[]>([]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function add(input: ToastInput): string {
	const variant = input.variant ?? 'info';
	const id = createId();
	const duration = input.duration ?? (input.action ? 0 : DEFAULT_DURATIONS[variant]);

	const toast: Toast = {
		id,
		variant,
		message: input.message,
		subtitle: input.subtitle,
		dismissible: input.dismissible ?? true,
		duration,
		action: input.action
	};

	toasts = [...toasts, toast];

	if (duration > 0) {
		const timer = setTimeout(() => {
			dismiss(id);
		}, duration);
		timers.set(id, timer);
	}

	return id;
}

function dismiss(id: string) {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	toasts = toasts.filter((t) => t.id !== id);
}

function clear() {
	for (const timer of timers.values()) {
		clearTimeout(timer);
	}
	timers.clear();
	toasts = [];
}

/** Convenience methods */
function error(message: string, options?: Omit<ToastInput, 'message' | 'variant'>) {
	return add({ ...options, variant: 'error', message });
}

function warning(message: string, options?: Omit<ToastInput, 'message' | 'variant'>) {
	return add({ ...options, variant: 'warning', message });
}

function info(message: string, options?: Omit<ToastInput, 'message' | 'variant'>) {
	return add({ ...options, variant: 'info', message });
}

function success(message: string, options?: Omit<ToastInput, 'message' | 'variant'>) {
	return add({ ...options, variant: 'success', message });
}

export const toastStore = {
	get toasts() {
		return toasts;
	},
	add,
	dismiss,
	clear,
	error,
	warning,
	info,
	success
};
