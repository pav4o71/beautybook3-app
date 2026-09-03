"use client";

import { useActionState, useCallback, useMemo, useState, useTransition } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ListingCard, type ListingCardData } from "@/components/listing/ListingCard";
import { isPremiumListing } from "@/lib/listing";
import type { ListingPhotoRecord } from "@/lib/listing-gallery";
import { effectivePhotoLimit } from "@/lib/listing-gallery";
import { sectionLabel, type StorefrontSectionId } from "@/lib/listing-layout";
import type { ListingTheme } from "@/lib/listing-theme";
import type { ListingEditorState } from "@/lib/listing-editor";
import {
  controlClass,
  errorAlertClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  successAlertClass,
} from "@/lib/ui";
import {
  deleteListingPhotoAction,
  reorderListingPhotosAction,
  saveListingCustomizationAction,
  saveListingPresetAction,
  setPhotoLimitAction,
  updatePhotoCaptionAction,
  uploadListingPhotoAction,
} from "./actions";

type DraftState = {
  theme: ListingTheme;
  layout: StorefrontSectionId[];
  tagline: string;
  highlights: string[];
  featuredServiceId: string;
  photos: ListingPhotoRecord[];
  photoLimit: number;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function ListingEditorClient({
  initialState,
  services,
  saved,
}: {
  initialState: ListingEditorState;
  services: { id: string; name: string }[];
  saved?: boolean;
}) {
  const premium = isPremiumListing(initialState.listingTier);

  const [draft, setDraft] = useState<DraftState>(() => ({
    theme: initialState.theme,
    layout: initialState.layout,
    tagline: initialState.tagline ?? "",
    highlights: initialState.highlights,
    featuredServiceId: initialState.featuredServiceId ?? "",
    photos: initialState.photos,
    photoLimit: initialState.photoLimit,
  }));

  const [previewMode, setPreviewMode] = useState<"card" | "storefront">("card");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveState, saveFormAction, savePending] = useActionState(
    saveListingCustomizationAction,
    {},
  );

  const resetDraft = useCallback(() => {
    setDraft({
      theme: initialState.theme,
      layout: initialState.layout,
      tagline: initialState.tagline ?? "",
      highlights: initialState.highlights,
      featuredServiceId: initialState.featuredServiceId ?? "",
      photos: initialState.photos,
      photoLimit: initialState.photoLimit,
    });
    setError(null);
    setMessage("Changes discarded.");
  }, [initialState]);

  const cardPreview: ListingCardData = useMemo(() => {
    const cover = draft.photos.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? initialState.coverImageUrl;
    return {
      name: initialState.name,
      slug: initialState.slug,
      listingTier: initialState.listingTier,
      coverImageUrl: cover,
      photoCount: draft.photos.length,
      tagline: draft.tagline || null,
      accentColor: draft.theme.accentColor,
      listingTheme: draft.theme,
      featuredService: initialState.featuredService,
      cardHighlights: draft.highlights.slice(0, premium ? 3 : 2),
      city: initialState.primaryLocation?.city ?? "Manila",
      area: initialState.primaryLocation?.area ?? null,
      logoUrl: initialState.logoUrl,
    };
  }, [draft, initialState, premium]);

  const onLayoutDragEnd = (result: DropResult) => {
    if (!result.destination || !premium) return;
    setDraft((prev) => ({
      ...prev,
      layout: reorder(prev.layout, result.source.index, result.destination!.index),
    }));
  };

  const onPhotoDragEnd = (result: DropResult) => {
    if (!result.destination || !premium) return;
    const reordered = reorder(draft.photos, result.source.index, result.destination.index).map(
      (photo, index) => ({ ...photo, sortOrder: index }),
    );
    setDraft((prev) => ({ ...prev, photos: reordered }));
    startTransition(async () => {
      const res = await reorderListingPhotosAction(reordered.map((p) => p.id));
      if (res.error) setError(res.error);
    });
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      const res = await uploadListingPhotoAction({}, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      window.location.reload();
    });
    event.target.value = "";
  };

  const handleDeletePhoto = (photoId: string) => {
    startTransition(async () => {
      const res = await deleteListingPhotoAction(photoId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDraft((prev) => ({
        ...prev,
        photos: prev.photos.filter((p) => p.id !== photoId),
      }));
    });
  };

  const handleCaptionBlur = (photoId: string, caption: string) => {
    startTransition(async () => {
      await updatePhotoCaptionAction(photoId, caption);
    });
  };

  const handleSavePreset = () => {
    startTransition(async () => {
      const res = await saveListingPresetAction(presetName);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage("Preset saved.");
      setPresetName("");
    });
  };

  const handleExtendLimit = () => {
    startTransition(async () => {
      const res = await setPhotoLimitAction(draft.photoLimit + 3);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDraft((prev) => ({ ...prev, photoLimit: prev.photoLimit + 3 }));
      setMessage("Photo limit extended.");
    });
  };

  const limit = effectivePhotoLimit(initialState.listingTier, draft.photoLimit);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {saved ? <p className={successAlertClass}>Listing saved.</p> : null}
        {message ? <p className={successAlertClass}>{message}</p> : null}
        {saveState.error ? <p className={errorAlertClass}>{saveState.error}</p> : null}
        {error ? <p className={errorAlertClass}>{error}</p> : null}

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={sectionTitleClass}>Theme</h2>
          {!premium ? (
            <p className="text-sm text-zinc-600">
              Upgrade to Premium to customize colors and layout.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["backgroundColor", "Background"],
                  ["textColor", "Text"],
                  ["accentColor", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={labelClass}>
                  <span className={labelTextClass}>{label}</span>
                  <input
                    type="color"
                    value={draft.theme[key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, [key]: e.target.value },
                      }))
                    }
                    className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white"
                  />
                </label>
              ))}
              <label className={labelClass}>
                <span className={labelTextClass}>Font scale</span>
                <select
                  value={draft.theme.fontScale}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      theme: {
                        ...prev.theme,
                        fontScale: e.target.value as ListingTheme["fontScale"],
                      },
                    }))
                  }
                  className={controlClass}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionTitleClass}>Photos</h2>
            {premium ? (
              <span className="text-xs text-zinc-500">
                {draft.photos.length}/{limit}
              </span>
            ) : null}
          </div>
          {!premium ? (
            <p className="text-sm text-zinc-600">Standard listings show a single cover image.</p>
          ) : (
            <>
              <label className={labelClass}>
                <span className={labelTextClass}>Upload photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  disabled={isPending || draft.photos.length >= limit}
                  className={controlClass}
                />
              </label>
              {draft.photos.length >= limit && draft.photoLimit < 20 ? (
                <button
                  type="button"
                  onClick={handleExtendLimit}
                  disabled={isPending}
                  className={secondaryButtonClass}
                >
                  Extend limit (+3)
                </button>
              ) : null}
              <DragDropContext onDragEnd={onPhotoDragEnd}>
                <Droppable droppableId="photos">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      {draft.photos.map((photo, index) => (
                        <Draggable key={photo.id} draggableId={photo.id} index={index}>
                          {(dragProvided) => (
                            <li
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="flex gap-3 rounded border border-zinc-200 p-2"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt=""
                                className="size-16 rounded object-cover"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <input
                                  defaultValue={photo.caption ?? ""}
                                  placeholder="Caption (optional)"
                                  onBlur={(e) => handleCaptionBlur(photo.id, e.target.value)}
                                  className={controlClass}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  disabled={isPending}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={sectionTitleClass}>Storefront layout</h2>
          {!premium ? (
            <p className="text-sm text-zinc-600">Premium required to reorder sections.</p>
          ) : (
            <DragDropContext onDragEnd={onLayoutDragEnd}>
              <Droppable droppableId="layout">
                {(provided) => (
                  <ul
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-1"
                  >
                    {draft.layout.map((section, index) => (
                      <Draggable key={section} draggableId={section} index={index}>
                        {(dragProvided) => (
                          <li
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
                          >
                            {sectionLabel(section)}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={sectionTitleClass}>Content</h2>
          <label className={labelClass}>
            <span className={labelTextClass}>Tagline</span>
            <input
              value={draft.tagline}
              onChange={(e) => setDraft((prev) => ({ ...prev, tagline: e.target.value }))}
              maxLength={120}
              className={controlClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Featured service</span>
            <select
              value={draft.featuredServiceId}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, featuredServiceId: e.target.value }))
              }
              className={controlClass}
            >
              <option value="">Cheapest bookable service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className={labelTextClass}>Highlights (up to 5)</legend>
            {Array.from({ length: 5 }, (_, i) => (
              <input
                key={i}
                value={draft.highlights[i] ?? ""}
                onChange={(e) => {
                  const next = [...draft.highlights];
                  next[i] = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    highlights: next.filter((h) => h.trim().length > 0),
                  }));
                }}
                placeholder={`Highlight ${i + 1}`}
                className={controlClass}
              />
            ))}
          </fieldset>
        </section>

        {premium ? (
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className={sectionTitleClass}>Presets</h2>
            <div className="flex gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className={controlClass}
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={isPending || !presetName.trim()}
                className={secondaryButtonClass}
              >
                Save preset
              </button>
            </div>
            {initialState.presets.length > 0 ? (
              <ul className="space-y-1 text-sm text-zinc-600">
                {initialState.presets.map((preset) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      className="text-zinc-900 underline hover:text-zinc-700"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          theme: preset.theme,
                          layout: preset.layout,
                        }))
                      }
                    >
                      Apply &quot;{preset.name}&quot;
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <form action={saveFormAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="theme" value={JSON.stringify(draft.theme)} />
          <input type="hidden" name="layout" value={JSON.stringify(draft.layout)} />
          <input type="hidden" name="tagline" value={draft.tagline} />
          <input type="hidden" name="featuredServiceId" value={draft.featuredServiceId} />
          {draft.highlights.map((h) => (
            <input key={h} type="hidden" name="highlights" value={h} />
          ))}
          <button type="submit" disabled={isPending || savePending} className={primaryButtonClass}>
            Save listing
          </button>
          <button
            type="button"
            onClick={resetDraft}
            disabled={isPending || savePending}
            className={secondaryButtonClass}
          >
            Discard
          </button>
        </form>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("card")}
              className={
                previewMode === "card" ? primaryButtonClass : secondaryButtonClass
              }
            >
              Card
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("storefront")}
              className={
                previewMode === "storefront" ? primaryButtonClass : secondaryButtonClass
              }
            >
              Storefront
            </button>
          </div>
          {previewMode === "card" ? (
            <div className="max-w-sm">
              <ListingCard listing={cardPreview} preview />
            </div>
          ) : (
            <div
              className="space-y-4 rounded-lg p-4"
              style={{
                backgroundColor: premium ? draft.theme.backgroundColor : "#FFFFFF",
                color: premium ? draft.theme.textColor : "#18181B",
                fontSize:
                  draft.theme.fontScale === "lg"
                    ? "1.125rem"
                    : draft.theme.fontScale === "sm"
                      ? "0.875rem"
                      : "1rem",
              }}
            >
              <p className="text-xs uppercase tracking-wide opacity-60">Storefront preview</p>
              <p className="text-xl font-semibold">{initialState.name}</p>
              {draft.tagline ? <p className="opacity-80">{draft.tagline}</p> : null}
              {premium && draft.photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2">
                  {draft.photos.slice(0, 4).map((photo) => (
                    <li key={photo.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption ?? ""}
                        className="h-24 w-full rounded object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <ol className="list-decimal pl-5 text-sm opacity-80">
                {draft.layout.map((section) => (
                  <li key={section}>{sectionLabel(section)}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
