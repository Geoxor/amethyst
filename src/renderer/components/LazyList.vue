<script setup lang="ts">
import { amethyst, useShortcuts } from "@/amethyst";
import BaseChip from "@/components/BaseChip.vue";
import { useContextMenu } from "@/components/ContextMenu";
import Cover from "@/components/CoverArt.vue";
import { AmethystIcon, HeartIcon, SSDIcon, PlayIcon, NotPlayingIcon } from "@/icons";
import { saveArrayBufferToFile } from "@/logic/dom";
import { convertDfpwm } from "@/logic/encoding";
import { Track } from "@/logic/track";
import { useInspector } from "./Inspector";
import { ref, watch } from 'vue';

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
    { title: "Show in Explorer...", icon: AmethystIcon, action: () => amethyst.showItem(track.path) },
    { title: "Export cover...", icon: AmethystIcon, action: () => track.exportCover() },
    { title: "Reload metadata", icon: AmethystIcon, action: () => track.fetchAsyncData(true) },
    { title: "Remove from queue", icon: AmethystIcon, red: true, action: () => amethyst.player.queue.remove(track) },
    { title: "Delete from disk", icon: AmethystIcon, red: true, action: () => track.delete() },
  ]);
};

</script>

<template>
  <div class="text-13px min-h-0 h-full flex flex-col text-left relative select-none">
  <div class="overflow-y-auto">
    <table class="ml-8 mr-8 justify-between text-left">
      <colgroup>
        <col span="1" width="10">
        <col span="1" width="50">
        <col span="2" width="300">
        <col span="8" width="200">
      </colgroup>
      <tr>
          <!-- used as spacer for Status Icons name -->
          <th class="th"></th>
          <th class="th title">Cover</th>
          <th class="th title">Title</th>
          <!-- used as spacer for Artist name -->
          <th class="th"></th>
          <th class="th">Location</th>
          <th class="th">Album</th>
          <th class="th">Year</th>
          <th class="th">Duration</th>
          <th class="th">Format</th>
          <th class="th">Favorite</th>
          <th class="th">Bitrate</th>
          <th class="th">Size</th>
      </tr>
      <tr
        v-for="(track, index) in tracks" :key="index"
        :class="[
            isHoldingControl && 'control cursor-external-pointer', 
            track.hasErrored && 'opacity-50 not-allowed',
            track.deleted && 'opacity-50 !text-rose-400 not-allowed',

            amethyst.player.getCurrentTrack()?.path == track.path && 'currentlyPlaying',
            useInspector().state.isVisible && useInspector().state.currentItem == track && 'currentlyInspecting'
          ]"
          class="row"
          @contextmenu="handleContextMenu($event, track)"
          @keypress.prevent
          @click="isHoldingControl ? amethyst.showItem(track.path) : amethyst.player.play(track)"
      >
          <td>
            <PlayIcon
              v-if="amethyst.player.getCurrentTrack()?.path == track.path "
              class="h-8 w-8 min-h-8 min-w-8 mr-2 ml-2"
            />
            <NotPlayingIcon
              v-else
              class="h-8 w-8 min-h-8 min-w-8 mr-2 ml-2"
            />
          </td>

          <td>
            <AmethystIcon
              v-if="track.isLoading || track.deleted || track.hasErrored"
              class="h-8 w-8 min-h-8 min-w-8 rounded-md"
            />
    
            <cover
              v-else
              class="w-8 h-8 min-h-8 min-w-8 rounded-md"
              :url="(track.isLoaded && track.getCover()) as string"
            />
          </td>

          <td>
            <span v-if="track.getTitle()">{{ track.getTitle() }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <span v-if="track.getArtistsFormatted()">{{ track.getArtistsFormatted() }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <button class="cursor-pointer hover:text-white" @click.stop.prevent="amethyst.showItem(track.path)">
                <SSDIcon class="h-5 w-5 min-h-5 min-w-5"/>
            </button>
          </td>

          <td>
            <span v-if="track.getAlbumFormatted()">{{ track.getAlbumFormatted() }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <span v-if="track.getMetadata()">{{ track.getMetadata()?.common.year }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <span v-if="track.getDurationFormatted(true)">{{ track.getDurationFormatted(true) }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <span v-if="track.getMetadata()">{{ track.getMetadata()?.format.container }}</span>
            <span v-else>N/A</span>
          </td>

          <td class="pl-4">
            <HeartIcon class="h-4 w-4 min-h-4 min-w-4"/>
          </td>

          <td>
            <span v-if="track.getBitrateFormatted()">{{ track.getBitrateFormatted() }}</span>
            <span v-else>N/A</span>
          </td>

          <td>
            <span v-if="track.getFilesizeFormatted()">{{ track.getFilesizeFormatted() }}</span>
            <span v-else>N/A</span>
          </td>
      </tr>
    </table>
  </div>
  </div>
</template>

<style lang="postcss">

th {
  @apply sticky top-0 z-10 bg-surface-900 pt-4 pb-4;
}

td {
  @apply pt-2 pb-2;
}

.row {

  &:hover {
    @apply text-accent;

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

</style>