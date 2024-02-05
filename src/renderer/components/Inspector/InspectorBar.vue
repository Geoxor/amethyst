<script setup lang="ts">
import { amethyst } from "@/amethyst";
import { AmethystIcon } from "@/icons";
import { Track } from "@/logic/track";
import { bytesToHuman } from "@shared/formating";
import { computed, onMounted, onUnmounted } from "vue";
import { useInspector, getInspectableItemType } from ".";
import BaseChip from "../BaseChip.vue";
import { useContextMenu } from "../ContextMenu";
import CoverArt from "../CoverArt.vue";
const inspector = useInspector();
const currentItem = computed(() => inspector.state.currentItem);
const handlePlay = (track: Track) => {
  inspector.inspect(track);
};

onMounted(() => {
  amethyst.player.on("play", handlePlay);
  const currentTrack = amethyst.player.getCurrentTrack();
  if (!currentTrack) return;
  if (!currentItem.value) inspector.inspect(currentTrack);
});

onUnmounted(() => {
  amethyst.player.off("play", handlePlay);
});

</script>

<template>
  <div
    class="inspector absolute text-12px top-2 right-2 overflow-hidden w-min-64 rounded-4px z-30 text-primary-900 border-1 border-surface-600 bg-surface-1000"
  >
    <div class="h-10 pl-3 flex w-full  justify-between items-center">
      <div class="flex gap-2 items-center">
        <AmethystIcon />
        <h1>Inspector</h1>
        <BaseChip>
          {{ getInspectableItemType(currentItem) }}
        </BaseChip>
      </div>
      <button
        class="p-3 cursor-pointer hover:text-white"
        @click="inspector.hide()"
      >
        <AmethystIcon class="w-4 h-4" />
      </button>
    </div>

    <div
      v-if="currentItem instanceof Track && currentItem"
      class="pb-10 h-full overflow-y-auto"
    >
      <section>
        <h1>
          <AmethystIcon />
          Metadata
          <loading-icon
            v-if="!currentItem.isLoaded"
            class="h-3 animate-spin w-3 min-h-3 min-w-3"
          />
        </h1>
        <li>
          <h1>Artist</h1>
          <input :value="currentItem.getArtistsFormatted()">
        </li>
        <li>
          <h1>Title</h1>
          <input :value="currentItem.getTitleFormatted()">
        </li>
        <li>
          <h1>Album</h1>
          <input :value="currentItem.getAlbumFormatted()">
        </li>
        <li>
          <h1>Year</h1>
          <input :value="currentItem.getMetadata()?.common.year">
        </li>
        <li>
          <h1>Track Number</h1>
          <input :value="currentItem.getMetadata()?.common.track.no">
        </li>
        <button
          class="cursor-pointer"
          @click="currentItem.fetchAsyncData(true)"
        >
          Refresh metadata
        </button>
      </section>
      <section>
        <h1>
          <AmethystIcon />
          Covers
          <loading-icon
            v-if="!currentItem.isLoaded"
            class="h-3 animate-spin w-3 min-h-3 min-w-3"
          />
        </h1>
        <div
          v-for="(picture, i) of currentItem.getMetadata()?.common.picture"
          :key="picture.data.byteLength"
          class="flex gap-2 py-1  last:border-none"
        >
          <CoverArt 
            class="w-16 rounded-4px"
            :url="currentItem.getCoverByFace(i)"
            @contextmenu="useContextMenu().open({x: $event.x, y: $event.y}, [
              { title: 'Export cover...', icon: AmethystIcon, action: () => currentItem.exportCover(i) },
            ]);"
          />
          <div class="flex flex-col gap-1 w-full">
            <li class="flex justify-between gap-2">
              <h1>Face</h1>
              <p>
                {{ picture.type === "Media (e.g. label side of CD)" ? 'Disc' : picture.type }}
              </p>
            </li>
            <li class="flex justify-between gap-2">
              <h1>Format</h1>
              <p> {{ picture.format }} </p>
            </li>
            <li class="flex justify-between gap-2">
              <h1>Size</h1>
              <p> {{ bytesToHuman(picture.data.byteLength || 0) }} </p>
            </li>
          </div>
        </div>
      </section>
      <section>
        <h1 class="">
          <AmethystIcon />
          File Info
        </h1>

        <li>
          <h1>Name</h1>
          <p> {{ currentItem.getFilename() }}</p>
        </li>
        <li>
          <h1>Size</h1>
          <p> {{ currentItem.getFilesizeFormatted() }}</p>
        </li>
        <button
          class="cursor-pointer"
          @click="amethyst.showItem(currentItem.path, true)"
        >
          Show in explorer
          <AmethystIcon />
        </button>
      </section>
      <section>
        <h1>
          <AmethystIcon />
          Audio Properties
        </h1>
        <li>
          <h1>Channels</h1>
          <p> {{ currentItem.getChannels() }}</p>
        </li>
        <li>
          <h1>Duration</h1>
          <p> {{ currentItem.getDurationFormatted() }}</p>
        </li>
        <li>
          <h1>Container</h1>
          <p> {{ currentItem.getMetadata()?.format.container }}</p>
        </li>
        <li>
          <h1>Codec</h1>
          <p> {{ currentItem.getMetadata()?.format.codec }}</p>
        </li>
        <li>
          <h1>Bitrate</h1>
          <p> {{ (((currentItem.getMetadata()?.format.bitrate) || 0) / 1000).toFixed(2) }} Kbps</p>
        </li>
        <li>
          <h1>Bits</h1>
          <p> {{ currentItem.getMetadata()?.format.bitsPerSample }} bit</p>
        </li>
        <li>
          <h1>Samplerate</h1>
          <p> {{ currentItem.getMetadata()?.format.sampleRate }} Hz</p>
        </li>
      </section>
      <section>
        <h1>
          <AmethystIcon />
          State
        </h1>
        <li>
          <h1>Errored</h1>
          <p> {{ currentItem.hasErrored ? "Yes" : "No" }}</p>
        </li>
        <li>
          <h1>Loaded</h1>
          <p> {{ currentItem.isLoaded ? "Yes" : "No" }}</p>
        </li>
        <li>
          <h1>Loading</h1>
          <p> {{ currentItem.isLoading ? "Yes" : "No" }}</p>
        </li>
        <button
          class="cursor-pointer"
          @click="amethyst.showItem(currentItem.getCachePath(), true)"
        >
          Show .amf
          <AmethystIcon />
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped lang="postcss">
.inspector {
  height: calc(100% - 16px);
}

section {
  @apply flex flex-col gap-1 p-3;
  /* border */
  @apply border-b-1 border-b-surface-600 border-t-transparent border-r-transparent border-l-transparent;

  & button {
    @apply bg-surface-800 mt-2 items-center flex justify-center gap-2 w-full hover:bg-purple-400 hover:bg-opacity-10 hover:text-purple-400 rounded-4px py-1.5;
  }

  &:hover {
    @apply bg-surface-800;
    & input,
    & p {
      @apply bg-surface-600;
    }
    & button:not(:hover) {
      @apply bg-surface-600;
    }
  }

  & li {
    @apply flex justify-between gap-2 items-center;
    & h1 {
      @apply text-primary-1000;
    }
  }
  & > h1 {
    @apply text-purple-400 pb-2 flex gap-2 items-center;
  }

  & input,
  & p {
    @apply px-2 py-1.5 text-7px bg-surface-800 rounded-4px overflow-hidden overflow-ellipsis;
    font-family: "aseprite";
  }

  input {
    @apply border-1 border-transparent;
    &:hover {
      @apply bg-purple-400 bg-opacity-25 text-white;
    }
    &:focus {
      @apply bg-purple-400 bg-opacity-25 border-1 border-purple-400 text-white;
    }
  }
}

</style>