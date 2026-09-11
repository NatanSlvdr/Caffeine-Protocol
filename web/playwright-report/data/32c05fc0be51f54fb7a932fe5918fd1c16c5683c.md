# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.ts >> settings, lossless source, structural editing, and import/export confirmation
- Location: tests/e2e/game.spec.ts:31:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[id^=DndLiveRegion]')
Expected substring: "Picked up draggable item"
Received string:    "Draggable item 1 was moved over droppable area 1."
Timeout: 10000ms

Call log:
  - Expect "toContainText" locator('[id^=DndLiveRegion]') with timeout 10000ms
  - waiting for locator('[id^=DndLiveRegion]')
    24 × locator resolved to <div role="status" aria-atomic="true" id="DndLiveRegion-0" aria-live="assertive">Draggable item 1 was moved over droppable area 1.</div>
       - unexpected value "Draggable item 1 was moved over droppable area 1."

```

```yaml
- status: Draggable item 1 was moved over droppable area 1.
```

# Test source

```ts
  1  | import { test,expect } from '@playwright/test';
  2  | import type { Page } from '@playwright/test';
  3  | import { lessons,stories } from '../../src/data';
  4  | import { newSave,SAVE_KEY } from '../../src/domain/persistence';
  5  | async function ready(page:Page){await page.goto('/');await expect(page.getByRole('heading',{name:'Good coffee. Better instructions.'})).toBeVisible();}
  6  | async function finishObservation(page:Page){await page.getByRole('button',{name:'Watch service'}).click();await expect(page.getByRole('button',{name:'Back to campaign',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'4× playback',exact:true}).click();await page.clock.fastForward(40_000);await expect(page.getByRole('button',{name:'Back to campaign',exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to campaign',exact:true}).click();}
  7  | async function fit(page:Page,selector:string){const box=await page.locator(selector).boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);}
  8  | test('a new café through observation, a win, failure, debugging, and persistence',async({page})=>{
  9  |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await ready(page);
  10 |  await page.getByRole('button',{name:'Explore the 14 shifts'}).click();await expect(page.locator('.shift-card')).toHaveCount(14);await expect(page.getByRole('button',{name:'Shift 3: Boot Sequence, locked',exact:true})).toBeDisabled();
  11 |  await page.getByRole('button',{name:'Start shift',exact:true}).click();await expect(page.getByRole('button',{name:'Add block',exact:true})).toBeDisabled();await expect(page.getByText('Automatic service',{exact:true})).toBeVisible();await finishObservation(page);
  12 |  await page.getByRole('button',{name:'Start shift',exact:true}).click();await finishObservation(page);
  13 |  await page.getByRole('button',{name:'Start shift',exact:true}).click();await expect(page.getByRole('heading',{name:'A voice at the counter'})).toBeVisible();await page.getByRole('button',{name:"Let's open the café"}).click();
  14 |  for(const command of ['TICKET','ITEM coffee','SUBMIT']){await page.locator('#instruction').selectOption(command);await page.getByRole('button',{name:'Add block',exact:true}).click();}
  15 |  await page.keyboard.press('Control+Enter');await expect(page.getByRole('status',{name:'Service status'})).toContainText('Every order checked');await expect(page.getByRole('button',{name:'Stop & edit'})).toBeVisible();await expect(page.getByLabel('Block 1',{exact:true})).toBeDisabled();
  16 |  await page.getByRole('button',{name:'Inspect',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Step block',exact:true}).click();await expect(page.locator('.trace-current')).toContainText('LISTEN');await page.getByRole('button',{name:'Next customer',exact:true}).click();await expect(page.locator('.inspector-nav')).toContainText('02 / 02');await page.getByRole('button',{name:'Restart seed',exact:true}).click();await expect(page.locator('.inspector-nav')).toContainText('L03_B');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Stop & edit'}).click();
  17 |  await page.getByRole('button',{name:'Text',exact:true}).click();await page.getByRole('textbox',{name:'Program source'}).fill('BROKEN\nLISTEN');await page.keyboard.press('Control+Enter');await expect(page.getByRole('status',{name:'Service status'})).toContainText('Unknown or locked instruction: BROKEN');await page.getByRole('button',{name:'Results',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Block 1');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Stop & edit'}).click();await page.getByRole('button',{name:'Blocks',exact:true}).click();await expect(page.locator('.block.failure')).toHaveAttribute('data-line','0');
  18 |  await page.reload();await page.getByRole('button',{name:'Text',exact:true}).click();await expect(page.getByRole('textbox',{name:'Program source'})).toHaveValue('BROKEN\nLISTEN');await page.getByRole('button',{name:'Back to campaign',exact:true}).click();await page.getByRole('button',{name:'Start shift',exact:true}).click();await page.getByRole('button',{name:'Text',exact:true}).click();await expect(page.getByRole('textbox',{name:'Program source'})).toHaveValue(lessons[2].solution);
  19 |  expect(errors).toEqual([]);
  20 | });
  21 | test('all remaining shifts, every interlude, and the final ending',async({page})=>{
  22 |  const seed={...newSave(),unlocked:2,selected:2,stars:{0:0,1:0}};
  23 |  await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:SAVE_KEY,save:seed});await ready(page);await page.getByRole('button',{name:'Continue your café'}).click();
  24 |  for(let index=2;index<14;index++){
  25 |   if(stories[index]){await expect(page.getByRole('heading',{name:stories[index].title})).toBeVisible();await page.getByRole('button',{name:"Let's open the café"}).click();}
  26 |   await page.getByRole('button',{name:'Help',exact:true}).click();await page.getByRole('button',{name:'Reveal worked example'}).click();await page.getByRole('button',{name:'Use this example'}).click();await page.getByRole('button',{name:'Run service'}).click();await expect(page.getByRole('status',{name:'Service status'})).toContainText('★★★');
  27 |   if(index<13){await page.getByRole('button',{name:'Back to campaign',exact:true}).click();await page.getByRole('button',{name:'Start shift',exact:true}).click();}else await page.getByRole('button',{name:'Closing time',exact:true}).click();
  28 |  }
  29 |  await expect(page.getByRole('heading',{name:'Closing time.'})).toBeVisible();await expect(page.locator('.ending-score')).toContainText('36 / 36');await expect(page.getByText('“It is now.”',{exact:true})).toBeVisible();
  30 | });
  31 | test('settings, lossless source, structural editing, and import/export confirmation',async({page})=>{
  32 |  const seed={...newSave(),unlocked:13,selected:7,story:{7:true},drafts:{7:'LISTEN\nTICKET\nITEM heard\nSUBMIT'}};
  33 |  await page.addInitScript(({key,save})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(save));sessionStorage.setItem('seeded','1');}},{key:SAVE_KEY,save:seed});await ready(page);await page.getByRole('button',{name:'Open the café',exact:true}).click();
  34 |  await page.getByLabel('Block 1',{exact:true}).focus();await page.locator('#instruction').selectOption('IF tea');await page.getByRole('button',{name:'Add block',exact:true}).click();await expect(page.getByLabel('Block 2',{exact:true})).toHaveValue('IF tea');await expect(page.getByLabel('Block 3',{exact:true})).toHaveValue('END');
> 35 |  await page.getByRole('button',{name:'Drag block 2 and its group',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('[id^=DndLiveRegion]')).toContainText('Picked up draggable item');await page.keyboard.press('ArrowUp');await expect(page.locator('[id^=DndLiveRegion]')).toContainText('over droppable area 0');await page.keyboard.press('Space');await expect(page.getByLabel('Block 1',{exact:true})).toHaveValue('IF tea');await expect(page.getByLabel('Block 2',{exact:true})).toHaveValue('END');
     |                                                                                                                                                                             ^ Error: expect(locator).toContainText(expected) failed
  36 |  await page.getByRole('button',{name:'Delete block 2',exact:true}).click();await page.getByRole('button',{name:'Delete block 1',exact:true}).click();
  37 |  await page.getByRole('button',{name:'Text',exact:true}).click();const text='# my café\n\n LISTEN \nTICKET\nITEM heard\nSUBMIT\n';await page.getByRole('textbox',{name:'Program source'}).fill(text);await page.getByRole('button',{name:'Blocks',exact:true}).click();await page.getByRole('button',{name:'Text',exact:true}).click();await expect(page.getByRole('textbox',{name:'Program source'})).toHaveValue(text);
  38 |  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('slider',{name:'Music volume',exact:true}).fill('0');await page.getByRole('checkbox',{name:'Reduced motion'}).check();await page.reload();await expect(page.getByRole('slider',{name:'Music volume',exact:true})).toHaveValue('0');await expect(page.getByRole('checkbox',{name:'Reduced motion'})).toBeChecked();
  39 |  const exported=page.waitForEvent('download');await page.getByRole('button',{name:'Export café'}).click();const file=await exported;expect(file.suggestedFilename()).toBe('caffeine-protocol-save.json');
  40 |  await page.getByRole('button',{name:'Start a new café',exact:true}).click();await page.getByRole('button',{name:'Keep my café'}).click();await expect(page.getByRole('heading',{name:'The little things.'})).toBeVisible();
  41 |  await page.getByRole('button',{name:'Start a new café',exact:true}).click();await page.getByRole('button',{name:'Start new café',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('slider',{name:'Music volume',exact:true})).toHaveValue('0');
  42 |  await page.getByLabel('Import save file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.getByRole('alert')).toBeVisible();
  43 |  await page.getByLabel('Import save file').setInputFiles({name:'cafe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});await expect(page.getByRole('dialog')).toContainText('Replace this café?');await page.getByRole('button',{name:'Keep current café'}).click();
  44 |  await page.getByLabel('Import save file').setInputFiles({name:'cafe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});await page.getByRole('button',{name:'Replace café',exact:true}).click();await page.getByRole('button',{name:'Back to campaign',exact:true}).click();await expect(page.getByRole('button',{name:'Shift 14: Employee of the Month',exact:true})).toBeEnabled();
  45 | });
  46 | for(const width of [1280,1100])test(`framing and working controls at ${width} × 720`,async({page})=>{
  47 |  await page.setViewportSize({width,height:720});await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:SAVE_KEY,save:{...newSave(),unlocked:13,selected:13,story:{13:true}}});await ready(page);await page.getByRole('button',{name:'Open the café',exact:true}).click();await fit(page,'.editor-panel');await fit(page,'.scene-space');await fit(page,'.run-button');expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(width);await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.webgl-fallback')).toHaveCount(0);await page.screenshot({path:`test-results/workspace-${width}.png`});
  48 |  await page.getByRole('button',{name:'Help',exact:true}).click();await fit(page,'dialog');
  49 | });
  50 | test('offline reload retains the complete static game',async({page,context})=>{
  51 |  await ready(page);await page.evaluate(async()=>{await navigator.serviceWorker.ready;await new Promise<void>(resolve=>{if(navigator.serviceWorker.controller)resolve();else navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true});});});
  52 |  await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Good coffee. Better instructions.'})).toBeVisible();await page.getByRole('button',{name:'Open the café',exact:true}).click();await expect(page.getByRole('button',{name:'Watch service'})).toBeVisible();await expect(page.locator('canvas')).toBeVisible();
  53 | });
  54 | test('without WebGL the editor and validation remain readable and usable',async({page})=>{
  55 |  await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));const get=HTMLCanvasElement.prototype.getContext;Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,type:string,...args:unknown[]){return type.includes('webgl')?null:Reflect.apply(get,this,[type,...args]);}});},{key:SAVE_KEY,save:{...newSave(),unlocked:2,selected:2,story:{2:true},drafts:{2:lessons[2].solution}}});
  56 |  await ready(page);await page.getByRole('button',{name:'Open the café',exact:true}).click();await expect(page.locator('.webgl-fallback')).toBeVisible();await page.getByRole('button',{name:'Run service'}).click();await expect(page.getByRole('status',{name:'Service status'})).toContainText('Every order checked');await page.getByRole('button',{name:'Inspect',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Exact simulation timestamps');
  57 | });
  58 | 
```