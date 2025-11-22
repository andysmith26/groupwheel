import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
        it('links to the roster import page', async () => {
                render(Page);

                const link = page.getByRole('link', { name: /roster import/i });
                await expect.element(link).toBeInTheDocument();
                await expect.element(link).toHaveAttribute('href', '/programs/import');
        });
});
