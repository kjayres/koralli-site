import { writeFileSync } from 'node:fs';
import { deliveryArtwork } from '../src/scripts/art/delivery-assembly.mjs';
const markup=`<figure class="delivery-study" data-delivery>
${deliveryArtwork()}
<figcaption><button class="delivery-replay" data-delivery-replay type="button">Replay ↻</button></figcaption>
</figure>\n`;
writeFileSync(new URL('../src/sections/work-delivery.html',import.meta.url),markup);
console.log('Wrote the outline assembly with its static line drawing fallback.');
