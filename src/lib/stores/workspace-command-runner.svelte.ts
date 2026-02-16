import type { Result } from '$lib/types/result';

export interface WorkspaceToastAction {
	label: string;
	callback: () => void | Promise<void>;
}

export interface WorkspaceToastState {
	message: string;
	subtitle?: string;
	action?: WorkspaceToastAction;
}

type MessageFactory<Value> = string | ((value: Value) => string | null | undefined);

export interface WorkspaceCommandDescriptor<Success, Failure> {
	run: () => Promise<Result<Success, Failure>> | Result<Success, Failure>;
	onSuccess?: (value: Success) => void;
	onError?: (error: Failure) => void;
	undo?: () => void | Promise<void>;
	successMessage?: MessageFactory<Success>;
	errorMessage?: MessageFactory<Failure>;
	announceMessage?: MessageFactory<Success>;
	successSubtitle?: MessageFactory<Success>;
	errorSubtitle?: MessageFactory<Failure>;
	undoLabel?: string;
}

export interface WorkspaceCommandRunnerOptions {
	onAnnounce?: (message: string) => void;
}

export class WorkspaceCommandRunner {
	toast = $state<WorkspaceToastState | null>(null);
	announcement = $state('');

	private toastTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly onAnnounce?: (message: string) => void;

	constructor(options: WorkspaceCommandRunnerOptions = {}) {
		this.onAnnounce = options.onAnnounce;
	}

	async run<Success, Failure>(
		descriptor: WorkspaceCommandDescriptor<Success, Failure>
	): Promise<Result<Success, Failure>> {
		const result = await descriptor.run();

		if (result.status === 'ok') {
			descriptor.onSuccess?.(result.value);

			const successMessage = this.resolveMessage(descriptor.successMessage, result.value);
			if (successMessage) {
				const subtitle = this.resolveMessage(descriptor.successSubtitle, result.value) ?? undefined;
				const action = descriptor.undo
					? {
						label: descriptor.undoLabel ?? 'Undo',
						callback: async () => {
							await descriptor.undo?.();
							this.clearToast();
						}
					}
					: undefined;

				this.showToast(successMessage, action, subtitle);
			}

			const announce = this.resolveMessage(descriptor.announceMessage, result.value);
			if (announce) {
				this.announce(announce);
			}

			return result;
		}

		descriptor.onError?.(result.error);

		const errorMessage = this.resolveMessage(descriptor.errorMessage, result.error);
		if (errorMessage) {
			const subtitle = this.resolveMessage(descriptor.errorSubtitle, result.error) ?? undefined;
			this.showToast(errorMessage, undefined, subtitle);
		}

		return result;
	}

	showToast(message: string, action?: WorkspaceToastAction, subtitle?: string) {
		this.toast = { message, action, subtitle };

		if (this.toastTimeout) {
			clearTimeout(this.toastTimeout);
		}

		const duration = action ? 5000 : 2000;
		this.toastTimeout = setTimeout(() => {
			this.toast = null;
			this.toastTimeout = null;
		}, duration);
	}

	clearToast() {
		if (this.toastTimeout) {
			clearTimeout(this.toastTimeout);
			this.toastTimeout = null;
		}

		this.toast = null;
	}

	dispose() {
		this.clearToast();
	}

	private announce(message: string) {
		this.announcement = message;
		this.onAnnounce?.(message);
	}

	private resolveMessage<Value>(
		input: MessageFactory<Value> | undefined,
		value: Value
	): string | null {
		if (!input) {
			return null;
		}

		if (typeof input === 'function') {
			return input(value) ?? null;
		}

		return input;
	}
}
