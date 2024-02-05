import {i18n} from "@/amethyst";
import "@/tauri-utils";

import App from "@/App.vue";
import "virtual:windi-devtools";
import "virtual:windi.css";
// @ts-ignore no types
import {RecycleScroller} from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";

import { createApp } from "vue";
import { router } from "@/router";

const app = createApp(App);

app.component("RecycleScroller", RecycleScroller);
app.use(i18n);
app.use(router);
app.mount("#app");
