'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import {
  FALLBACK_MODEL_INFO,
  caveatDetails,
  caveatHeadline,
  type ModelInfo,
  type RatingSource,
} from '@/lib/simulation-api/model-info';

/**
 * A strip above a table of flood-hazard ratings saying what they are:
 * simulated, from a dated network model, not checked against field
 * records, on provisional thresholds, and blind to blocked drains and tide.
 * Collapsed to one line; the details open on click.
 */
export function ModelCaveat({
  source,
  info,
}: {
  source: RatingSource;
  info?: ModelInfo | null;
}) {
  const [open, setOpen] = useState(false);
  const model = info ?? FALLBACK_MODEL_INFO;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{caveatHeadline(model)}</span>
        <span className="flex items-center gap-0.5 font-medium">
          {open ? 'Less' : 'What this means'}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 pl-5">
          {caveatDetails(model, source).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="font-medium">Not in the model:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {model.not_modelled.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
