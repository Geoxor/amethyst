<script setup lang="ts">
import { amethyst, useState } from "@/amethyst";
import Cover from "@/components/CoverArt.vue";
import Slider from "@/components/input/BaseSlider.vue";
import { AmethystIcon, HeartIcon, NextIcon, PauseIcon, PlayIcon, PlaylistIcon, RepeatAllIcon, RepeatNoneIcon, RepeatOneIcon, ShuffleIcon } from "@/icons";
import { LoopMode } from "@/logic/player";
import { computed } from "vue";
import { useContextMenu } from "./ContextMenu";
import { useInspector } from "./Inspector";

const state = useState();

const handleVolumeMouseScroll = (e: WheelEvent) => {
  const delta = Math.sign(e.deltaY);
  delta > 0 ? amethyst.player.volumeDown() : amethyst.player.volumeUp();
};

const handleContextCoverMenu = ({x, y}: MouseEvent) => {
  useContextMenu().open({x, y}, [
    { title: "Inspect", icon: AmethystIcon, action: () => amethyst.player.getCurrentTrack() && useInspector().inspectAndShow(amethyst.player.getCurrentTrack()!) },
    { title: "Export cover...", icon: AmethystIcon, action: () => amethyst.player.getCurrentTrack()?.exportCover() },
    state.state.isShowingBigCover 
      ? { title: "Hide cover", icon: AmethystIcon, action: () => state.state.isShowingBigCover = false }
      : { title: "View cover", icon: AmethystIcon, action: () => state.state.isShowingBigCover = true },
  ]);
};

const handleSeekMouseScroll = (e: WheelEvent) => {
  const delta = Math.sign(e.deltaY);
  delta < 0 ? amethyst.player.seekForward() : amethyst.player.seekBackward();
};

const isCurrentTrackFavorited = computed(() => amethyst.player.getCurrentTrack()?.isFavorited);

</script>

<template>
  <div class="flex gap-2 justify-between items-center h-full w-full">
    <cover
      v-if="state.settings.value.showCoverArt" 
      class="rounded-4px h-19 w-19 min-h-19 min-w-19 text-primary-900 border-1 border-transparent cursor-pointer hover:border-primary-800"
      :class="[
        state.state.isShowingBigCover && 'border-primary-700'
      ]"
      :url="amethyst.player.getCurrentTrack()?.getCover()"
      @contextmenu="handleContextCoverMenu"
      @click="state.state.isShowingBigCover = !state.state.isShowingBigCover"
    />
    
    <div class="flex flex-col justify-between h-full w-full ">
      <div
        :class="[amethyst.getCurrentPlatform() === 'mobile' ? 'rounded-full ' : 'rounded-4px']"
        class="flex flex-col gap-2 transform-gpu p-2 px-4 -translate-y-1 items-center filter drop-shadow-lg absolute top-0 left-1/2 transform-gpu -translate-x-1/2 -translate-y-1/2"
      >
        <div class="flex text-primary-800 gap-2 text-text_title items-center ">
          <HeartIcon
            class="h-5 w-5 opacity-75 hover:opacity-100 "
            :class="[isCurrentTrackFavorited && 'text-primary']"
            @click="amethyst.player.getCurrentTrack()?.toggleFavorite()"
          />
          <!-- <playlist-icon class="opacity-75 hover:opacity-100 " /> -->
          <ShuffleIcon
            class="h-5 w-5 opacity-75 hover:opacity-100 "
            @click="amethyst.player.shuffle()"
          />
          <NextIcon
            class="h-5 w-5 opacity-75 hover:opacity-100  transform-gpu rotate-180"
            @click="amethyst.player.previous()"
          />
          <div
            class="flex items-center bg-text_title text-surface-600 rounded-full p-2 hover:bg-accent"
            @click="amethyst.player.isPlaying.value ? amethyst.player.pause() : amethyst.player.play()"
          >
            <PauseIcon
              v-if="amethyst.player.isPlaying.value"
              class="h-5 w-5 opacity-75 hover:opacity-100"
            />
            <PlayIcon
              v-else
              class="h-5 w-5 opacity-75 hover:opacity-100"
            />
          </div>
          <NextIcon
            class="h-5 w-5 opacity-75 hover:opacity-100 "
            @click="amethyst.player.skip()"
          />
          <RepeatAllIcon
            v-if="amethyst.player.loopMode.value == LoopMode.None"
            class="h-5 w-5 opacity-75 hover:opacity-100 text-accent"
            @click="amethyst.player.loopAll()"
          />
          <RepeatOneIcon
            v-if="amethyst.player.loopMode.value == LoopMode.All"
            class="h-5 w-5 opacity-75  hover:opacity-100 text-accent"
            @click="amethyst.player.loopOne()"
          />
          <RepeatNoneIcon
            v-if="amethyst.player.loopMode.value == LoopMode.One"
            class="h-5 w-5 opacity-75  hover:opacity-100 "
            @click="amethyst.player.loopNone()"
          />
          <PlaylistIcon
            class="h-5 w-5 opacity-75 hover:opacity-100"
          />
        </div>
      </div>

      <div class="flex justify-between disable-select no-drag">
        <div class="flex flex-col w-full py-1 font-bold gap-1 ">
          <h1
            class="text-13px hover:underline cursor-pointer overflow-hidden text-text_title overflow-ellipsis"
            @click=" amethyst.showItem(amethyst.player.getCurrentTrack()?.path!, true)"
          >
            {{ amethyst.player.getCurrentTrack()?.getTitleFormatted() }}
          </h1>
          <p class="text-10px text-text_subtitle">
            {{ amethyst.player.getCurrentTrack()?.getArtistsFormatted() }}
          </p>
        </div>
        <div class="flex flex-col w-full max-w-24 mt-1 gap-2 items-end">
          <slider
            id="volume"
            key="volume"
            v-model="amethyst.player.volume.value"
            class="w-full"
            min="0"
            max="1"
            step="0.001"
            @input="amethyst.player.setVolume(amethyst.player.volume.value)"
            @wheel.passive="handleVolumeMouseScroll"
          />
        </div>
      </div>
      <div class="flex flex py-1 gap-2 items-start justify-between disable-select no-drag">
        <slider
          id="seek"
          key="seek"
          v-model="amethyst.player.currentTime.value"
          class="w-full h-4"
          :max="amethyst.player.getCurrentTrack()?.getDurationSeconds()"
          @input="amethyst.player.seekTo(amethyst.player.currentTime.value)"
          @wheel.passive="handleSeekMouseScroll"
        />
        <p class="text-10px text-text_title">
          {{ amethyst.player.currentTimeFormatted(true) }} /
          {{ amethyst.player.getCurrentTrack()?.getDurationFormatted(true) }}
        </p>
      </div>
    </div>
  </div>
</template>