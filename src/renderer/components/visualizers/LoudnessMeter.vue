<script setup lang="ts">
import { Ref, onMounted, ref } from "vue";
// @ts-ignore no types
import { amethyst } from "@/amethyst";
import { smoothTween } from "@/logic/dom";
import { computeWidthPercentage, infinityClamp } from "@/logic/math";
import { LoudnessMeter } from "@domchristie/needles";

const props = defineProps<{ node: AudioNode }>();

const MINIMUM_LUFS = -20;

const 
  shortTerm = ref(MINIMUM_LUFS),
  momentary = ref(MINIMUM_LUFS),
  integrated = ref(MINIMUM_LUFS),
  momentaryMax = ref(MINIMUM_LUFS),
  shortTermMax = ref(MINIMUM_LUFS),
  integratedMax = ref(MINIMUM_LUFS);

onMounted(async () => {

  const loudnessMeter = new LoudnessMeter({
    source: props.node,
    // @ts-ignore
    workerUri: new URL("../../workers/needlesWorker.js", import.meta.url).toString()
  });

  const handleData = (event: { data: { mode: any; value: any; }}) => {
    let {mode, value} = event.data;
    let refToUpdate: Ref<number>;
    let maxRef: Ref<number>;

    switch (mode) {
      case "momentary":
        refToUpdate = momentary;
        maxRef = momentaryMax;
        break;
      case "short-term":
        refToUpdate = shortTerm;
        maxRef = shortTermMax;
        break;
      case "integrated":
        refToUpdate = integrated;
        maxRef = integratedMax;
        break;
      default:
        return;
    }

    value = infinityClamp(value, MINIMUM_LUFS);
    smoothTween(refToUpdate.value, value, 100, (tweenedNumber => refToUpdate.value = tweenedNumber));
    maxRef.value < value && smoothTween (maxRef.value, value, 25, (tweenedNumber => maxRef.value = tweenedNumber));
  };

  loudnessMeter.on("dataavailable", handleData);

  loudnessMeter.start();

  amethyst.player.on("play", () => {
    loudnessMeter.reset();
    loudnessMeter.resume();
    momentaryMax.value = MINIMUM_LUFS;
    shortTermMax.value = MINIMUM_LUFS;
    integratedMax.value = MINIMUM_LUFS;
  });
  
  amethyst.player.on("pause", () => loudnessMeter.pause());
});

</script>

<template>
  <div class="text-9px text-text_subtitle w-full max-w-40 flex flex-col justify-between h-full py-0.5 disable-select no-drag">
    <div class="meter">
      <div class="barBg">
        <div
          class="bar bg-primary duration-100"
          :style="`width: ${computeWidthPercentage(MINIMUM_LUFS, 0, momentary)}%`"
        />
      </div>
      
      <div class="flex justify-between w-full">
        <p class="type">
          Momentary
        </p>
        <div class="value">
          <p class="text-primary-900 text-opacity-50">
            max {{ momentaryMax.toFixed(2) }}
          </p> 
          <p class="text-text_title">
            {{ momentary.toFixed(2) }} LUFs
          </p>
        </div>
      </div>
    </div>
    <div class="meter">
      <div class="barBg">
        <div
          class="bar bg-primary duration-100"
          :style="`width: ${computeWidthPercentage(MINIMUM_LUFS, 0, shortTerm)}%`"
        />
      </div>
      <div class="flex justify-between w-full">
        <p class="type">
          Short-term
        </p>
        <div class="value">
          <p class="text-primary-900 text-opacity-50">
            max {{ shortTermMax.toFixed(2) }}
          </p> 
          <p class="text-text_title">
            {{ shortTerm.toFixed(2) }} LUFs
          </p>
        </div>
      </div>
    </div>
    <div class="meter">
      <div class="barBg">
        <div
          class="bar bg-primary duration-1000"
          :style="`width: ${computeWidthPercentage(MINIMUM_LUFS, 0, integrated)}%`"
        />
      </div>
      <div class="flex justify-between w-full">
        <p class="type">
          Integrated
        </p>
        <div class="value">
          <p class="text-primary-900 text-opacity-50">
            max {{ integratedMax.toFixed(2) }}
          </p> 
          <p class="text-text_title">
            {{ integrated.toFixed(2) }} LUFs
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
.meter {
  @apply flex flex-col gap-1.5;
}
.barBg {
  @apply bg-surface-600 w-full overflow-hidden rounded-2px;
}
.bar {
  @apply h-1 rounded-2px ;
}

.value {
  @apply flex;
  p {
    @apply w-13;
    text-align: end;
  }
}

</style>