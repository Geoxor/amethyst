<script setup lang="ts">
import { amethyst, useShortcuts } from "@/amethyst";
import BaseChip from "@/components/BaseChip.vue";
import { useContextMenu } from "@/components/ContextMenu";
import Cover from "@/components/CoverArt.vue";
import { AmethystIcon } from "@/icons";
import { saveArrayBufferToFile } from "@/logic/dom";
import { convertDfpwm } from "@/logic/encoding";
import { Track } from "@/logic/track";
import { useInspector } from "./Inspector";

defineProps<{tracks: Track[]}>();
const isHoldingControl = useShortcuts().isControlPressed;

// Context Menu options for this component 
const handleContextMenu = ({x, y}: MouseEvent, track: Track) => {
  useContextMenu().open({x, y}, [
    { title: "Play", icon: AmethystIcon, action: () => amethyst.player.play(track) },
    { title: "Inspect", icon: AmethystIcon, action: () => useInspector().inspectAndShow(track) },
    { title: "Encode to .dfpwm...", icon: AmethystIcon, action: async () => {
      saveArrayBufferToFile(
        await convertDfpwm(await track.getArrayBuffer()), 
        {
          filename: track.getFilenameWithoutExtension(), 
          extension: "dfpwm"
      });
    }},
    { title: "Show in Explorer...", icon: AmethystIcon, action: () => amethyst.showItem(track.path, true) },
    { title: "Export cover...", icon: AmethystIcon, action: () => track.exportCover() },
    { title: "Reload metadata", icon: AmethystIcon, action: () => track.fetchAsyncData(true) },
    { title: "Remove from queue", icon: AmethystIcon, red: true, action: () => amethyst.player.queue.remove(track) },
    { title: "Delete from disk", icon: AmethystIcon, red: true, action: () => track.delete() },
  ]);
};

</script>

<template>
  <div class="text-13px min-h-0 h-full flex flex-col text-left relative select-none">
    <header class="flex text-primary-900  font-bold mb-2 mr-1">
      <div class="w-4" />

      <div class="th">
        Title
      </div>
      <div class="th">
        Artist
      </div>
      <div class="min-w-1/4">
        Filename
      </div>
      <div class="th">
        Album
      </div>
      <div class="th max-w-16">
        Container
      </div>
      <div class="th max-w-24">
        Size <strong>{{ amethyst.player.queue.getTotalSizeFormatted() }}</strong>
      </div>
      <div class="th max-w-32">
        Duration <strong>{{ amethyst.player.queue.getTotalDurationFormatted() }}</strong>
      </div>
    </header>
    <RecycleScroller
      class="h-full"
      :items="tracks"
      :item-size="28"
      key-field="path"
      :buffer="32"
    >
      <template
        #default="{ item }"
      >
        <div
          :class="[
            isHoldingControl && 'control cursor-external-pointer', 
            item.hasErrored && 'opacity-50 not-allowed',
            item.deleted && 'opacity-50 !text-rose-400 not-allowed',

            amethyst.player.getCurrentTrack()?.path == item.path && 'currentlyPlaying',
            useInspector().state.isVisible && useInspector().state.currentItem == item && 'currentlyInspecting'
          ]"
          class="row"
          @contextmenu="handleContextMenu($event, item)"
          @keypress.prevent
          @click="isHoldingControl ? amethyst.showItem(item.path, true) : amethyst.player.play(item)"
        >
          <div
            class="td max-w-5"
          >
            <loading-icon
              v-if="item.isLoading"
              class="animate-spin h-5 w-5 min-h-5 min-w-5"
            />
            <error-icon
              v-else-if="item.hasErrored"
              class="h-5 w-5 min-h-5 min-w-5"
            />

            <AmethystIcon
              v-else-if="item.deleted"
              class="h-5 w-5 min-h-5 min-w-5"
            />
    
            <cover
              v-else
              class="w-5 h-5"
              :url="(item.isLoaded && item.getCover()) as string"
            />
          </div>
          <div class="td title">
            <span v-if="item.getTitle()">
              {{ item.getTitle() }}
            </span>
            <span
              v-else
            >
              n/a
            </span>
          </div>
          <div class="td ">
            <span v-if="item.getArtistsFormatted()">
              {{ item.getArtistsFormatted() }}
            </span>
            <span
              v-else
            >
              n/a
            </span>
          </div>
          <div
            class="td flex gap-1 min-w-1/4"
          >
            {{ item.getFilename() }}
          </div>

          <div class="td">
            <span v-if="item.getAlbumFormatted()">
              {{ item.getAlbumFormatted() }}
            </span>
            <span
              v-else
            >
              n/a
            </span>
          </div>
          <div class="td max-w-16">
            <BaseChip
              v-if="item.getMetadata()?.format.container"
              class="text-10px"
            >
              {{ item.getMetadata()?.format.container }}
            </BaseChip>
          </div>
          <div class="td max-w-24">
            {{ item.getFilesizeFormatted() }}
          </div>
          <div class="td max-w-32">
            {{ item.getDurationFormatted(true) }}
          </div>
        </div>
      </template>
    </RecycleScroller>
  </div>
</template>

<style lang="postcss">

.th,
.td {
  @apply flex-1 overflow-hidden text-text_subtitle;

  & strong {
    @apply text-13px text-opacity-50;
  }
}

.td {
  @apply overflow-hidden overflow-ellipsis flex items-center font-weight-user-defined text-13px;

  &.title {
    @apply text-text_title text-13px;
  }
}

.row {
  @apply h-7 gap-2 w-full flex;

  &:hover {
    @apply text-accent ;

  }

  &.control:hover {
    @apply underline;
  } 

  &.currentlyPlaying {
    @apply text-primary bg-primary bg-opacity-10;
    &:hover {
      @apply bg-opacity-15;
    }
  }

  &.currentlyInspecting {
    @apply text-primary bg-primary bg-opacity-10;
    &:hover {
      @apply bg-opacity-15;
    }
  }
}

.vue-recycle-scroller__slot {
  @apply flex;
}

.vue-recycle-scroller__slot,
.vue-recycle-scroller__item-view {
  @apply  text-left;
}

.vue-recycle-scroller__slot .th:first-child,
.vue-recycle-scroller__item-view .td:first-child {
  @apply w-4 max-w-4;
}

</style>