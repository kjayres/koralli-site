import { writeFileSync } from 'node:fs';
import { deliveryArtwork } from '../src/scripts/art/delivery-assembly.mjs';
const markup=`<figure class="delivery-study" data-delivery>
${deliveryArtwork()}
<figcaption><span class="delivery-credit">Henri Matisse, <cite>La Danse</cite>, 1910.<br>Image: <a href="https://commons.wikimedia.org/wiki/File:Henri_Matisse_-_Dance_1910.jpg" target="_blank" rel="noopener">Gandalf’s Gallery</a> · <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener">CC BY-SA 2.0</a></span><button class="delivery-replay" data-delivery-replay type="button">Replay assembly ↻</button></figcaption>
</figure>\n`;
writeFileSync(new URL('../src/sections/work-delivery.html',import.meta.url),markup);
console.log('Wrote the delivery assembly with its static painting fallback.');
