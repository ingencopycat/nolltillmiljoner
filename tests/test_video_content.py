"""Exercise the shared video renderer and delegated playback/language controls."""
import os
from pathlib import Path
import shutil
import subprocess
import unittest


class VideoContentTests(unittest.TestCase):
    def test_shared_video_content_and_interactions(self):
        root = Path(__file__).resolve().parents[1]
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node, 'Node.js is required')
        result = subprocess.run([node, '-e', r"""
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
let click;
const context = vm.createContext({document: {
  getElementById(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];},
  addEventListener(type, fn){if(type === 'click') click = fn;}, readyState:'loading',
  createElement(tag){return {tag};}
}, URLSearchParams, location:{search:''}, console, setTimeout(){}});
context.window = context;
vm.runInContext(fs.readFileSync('posts.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);
const posts = vm.runInContext('NTM_POSTS', context);
assert.equal(new Set(posts.map(p => p.slug)).size, posts.length);
const videos = posts.filter(p => p.media.type === 'youtube');
for(const post of videos){
  const html = context.renderPostView(post);
  assert.match(html, /class="ai-summary"/);
  assert.match(html, /data-summary-content="sv"/);
  assert.match(html, /data-summary-content="en" hidden/);
  assert.ok(html.includes(post.media.externalUrl));
  assert.ok(html.includes('data-video-id="' + post.media.videoId + '"'));
  assert.ok(!html.includes('<iframe'));
  for(const language of ['sv','en']) for(const paragraph of post.summary[language]) assert.ok(html.includes(paragraph));
  const file = 'post-' + post.slug + '.html';
  assert.ok(fs.readFileSync(file,'utf8').includes(html));
}
const post = videos.find(p => p.media.videoId === 'Uzc3tBB9pLg');
assert.ok(post); assert.equal(post.category, 'Video');
for(const language of ['sv','en']){
  assert.equal(post.summary[language].length, 22);
  assert.equal(post.summary[language].filter(p => /^\d+\. /.test(p)).length, 10);
}
assert.ok(post.content.includes('Anthony Pompliano'));
assert.ok(post.disclaimer.includes('AI-genererad'));
assert.ok(post.disclaimer.includes('inte NTM'));
const newestVideo = videos.find(p => p.media.videoId === 'VPuzUZlvk0U');
assert.ok(newestVideo); assert.equal(newestVideo.category, 'Video');
for(const language of ['sv','en']){
  assert.equal(newestVideo.summary[language].length, 28);
  assert.equal(newestVideo.summary[language].filter(p => /^\d+\. /.test(p)).length, 12);
}
assert.ok(newestVideo.content.includes('Linear vs. Exponential: AGI Has Arrived But Oil, Bonds and the Fed Oh My'));
assert.ok(newestVideo.disclaimer.includes('Jordi Visser, inte NTM'));
assert.ok([...posts].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,3).includes(newestVideo));
context.initYoutubePosts();
const contents = ['sv','en'].map(lang => ({dataset:{summaryContent:lang},hidden:lang === 'en'}));
const buttons = ['sv','en'].map(lang => ({dataset:{summaryLanguage:lang}, classList:{toggle(){}}, setAttribute(key,value){this[key]=value;}, closest(){return wrapper;}}));
const wrapper = {querySelectorAll(selector){return selector === '[data-summary-language]' ? buttons : contents;}};
for(const index of [1,0]){
  click({target:{closest(selector){return selector === '[data-summary-language]' ? buttons[index] : null;}}});
  assert.equal(contents[index].hidden,false); assert.equal(contents[1-index].hidden,true);
  assert.equal(buttons[index]['aria-pressed'],'true');
}
let player;
const media = {querySelector(){return player;},replaceChildren(node){player=node;}};
const preview = {dataset:{videoId:newestVideo.media.videoId},closest(selector){return selector === '[data-youtube-post]' ? wrapper : media;},getAttribute(){return newestVideo.title;}};
const event = {target:{closest(selector){return selector === '[data-youtube-preview]' ? preview : null;}}};
assert.equal(player,undefined); click(event);
assert.equal(player.tag,'iframe');
assert.equal(player.src,'https://www.youtube.com/embed/VPuzUZlvk0U?autoplay=1');
const firstPlayer = player; click(event); assert.equal(player,firstPlayer);
console.log('Video render, bilingual content, static output, discovery, language toggle and click-to-play checks passed.');
"""], cwd=root, capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
