<script setup lang="ts">
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

type LyricsResult = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

const track = ref("");
const artist = ref("");
const album = ref("");
const results = ref<LyricsResult[]>([]);
const selected = ref<LyricsResult | null>(null);
const busy = ref(false);
const error = ref("");
const savedPath = ref("");

const lyrics = computed(() => selected.value?.syncedLyrics || selected.value?.plainLyrics || "");
const format = computed(() => selected.value?.syncedLyrics ? "LRC" : "TXT");

async function search() {
  if (!track.value.trim() || !artist.value.trim() || !album.value.trim()) {
    error.value = "Заполни все три поля.";
    return;
  }

  busy.value = true;
  error.value = "";
  savedPath.value = "";
  results.value = [];
  selected.value = null;

  try {
    const query = new URLSearchParams({
      track_name: track.value.trim(),
      artist_name: artist.value.trim(),
      album_name: album.value.trim(),
    });
    const response = await fetch(`https://lrclib.net/api/search?${query}`);
    if (!response.ok) throw new Error(`LRCLIB вернул HTTP ${response.status}`);
    const found = await response.json() as LyricsResult[];
    results.value = found.filter((item) => !item.instrumental && (item.syncedLyrics || item.plainLyrics));
    if (!results.value.length) throw new Error("LRCLIB не нашёл текст по этим данным.");
    selected.value = results.value[0];
  } catch (reason) {
    error.value = typeof reason === "string" ? reason : reason instanceof Error ? reason.message : "Ошибка запроса к LRCLIB.";
  } finally {
    busy.value = false;
  }
}

async function save() {
  if (!selected.value || !lyrics.value) return;
  error.value = "";
  savedPath.value = "";
  try {
    const path = await invoke<string | null>("save_lyrics", {
      artist: selected.value.artistName,
      track: selected.value.trackName,
      synced: Boolean(selected.value.syncedLyrics),
      content: lyrics.value,
    });
    if (path) savedPath.value = path;
  } catch (reason) {
    error.value = typeof reason === "string" ? reason : "Не удалось сохранить файл.";
  }
}
</script>

<template>
  <main>
    <header class="intro">
      <div class="tag"><i></i> LRCLIB utility</div>
      <h1>Найти. Проверить.<br><span>Сохранить текст.</span></h1>
      <p>Миниатюрный portable-инструмент для получения синхронизированных и обычных текстов песен.</p>
    </header>

    <form class="form" @submit.prevent="search">
      <label><span>Название</span><input v-model="track" placeholder="No Surprises" autofocus /></label>
      <label><span>Автор</span><input v-model="artist" placeholder="Radiohead" /></label>
      <label><span>Альбом</span><input v-model="album" placeholder="OK Computer" /></label>
      <button class="search" :disabled="busy">{{ busy ? "Ищу…" : "Найти" }}</button>
    </form>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="savedPath" class="alert success">Сохранено: {{ savedPath }}</div>

    <section v-if="results.length" class="results">
      <aside>
        <div class="aside-title">Результаты <b>{{ results.length }}</b></div>
        <button v-for="item in results" :key="item.id" class="result" :class="{ active: selected?.id === item.id }" @click="selected = item; savedPath = ''">
          <span class="letter">{{ item.trackName[0] }}</span>
          <span class="meta"><strong>{{ item.trackName }}</strong><small>{{ item.artistName }} · {{ item.albumName }}</small></span>
          <em>{{ item.syncedLyrics ? "LRC" : "TXT" }}</em>
        </button>
      </aside>

      <article v-if="selected">
        <div class="article-head">
          <div><small>Предпросмотр · {{ format }}</small><h2>{{ selected.trackName }}</h2><p>{{ selected.artistName }} · {{ selected.albumName }}</p></div>
          <button class="save" @click="save">Сохранить .{{ format.toLowerCase() }}</button>
        </div>
        <pre>{{ lyrics }}</pre>
      </article>
    </section>

    <section v-else-if="!busy" class="empty"><div>♪</div><p>Результаты появятся здесь</p><small>Файлы сохраняются в папку Lyrics рядом с программой</small></section>
  </main>
</template>
