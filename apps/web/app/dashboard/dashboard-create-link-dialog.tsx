'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiMutation, ApiError } from '@/lib/api';
import type { LinkItem } from '@/lib/types';

export function CreateLinkDialog({
  open,
  onClose,
  onCreated,
  workspaceId,
  initialUrl = '',
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (link: LinkItem) => void;
  workspaceId: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setSlug('');
      setTitle('');
      setCampaign('');
      setError('');
    }
  }, [initialUrl, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^https?:\/\/[^\s]+$/i.test(url)) {
      setError('Use a valid http or https destination.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await apiMutation<{ link: LinkItem }>(`/v1/workspaces/${workspaceId}/links`, {
        destination_url: url,
        slug: slug || undefined,
        title: title || undefined,
        campaign: campaign || undefined,
      });
      onCreated(data.link);
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to create the link. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader className="pr-10">
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-coral-50 to-lilac/60 text-coral-600 shadow-sm">
            <Icon name="link" size={18} />
          </span>
          <DialogTitle>Create a new link</DialogTitle>
          <DialogDescription>Make a destination easier to share, remember, and measure.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Destination URL" placeholder="https://example.com/your-story" value={url} onChange={setUrl} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Custom slug" placeholder="your-story" value={slug} onChange={setSlug} />
            <FormField label="Campaign" placeholder="Autumn launch" value={campaign} onChange={setCampaign} />
          </div>
          <FormField label="Link title" placeholder="A name you will recognize later" value={title} onChange={setTitle} />
          {error && (
            <p role="alert" className="rounded-xl border border-coral/20 bg-coral-50 px-3 py-2 text-xs text-coral-600">
              {error}
            </p>
          )}
          <DialogFooter className="mt-6 border-t border-border pt-5">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create link'}
              <Icon name="arrow" size={15} />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-foreground/65">{label}</Label>
      <Input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-background/60"
      />
    </div>
  );
}
