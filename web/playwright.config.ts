import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',timeout:90000,expect:{timeout:10000},fullyParallel:false,workers:1,
 reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:720},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1280,height:720}}},{name:'firefox',use:{...devices['Desktop Firefox'],viewport:{width:1280,height:720}}},{name:'webkit',use:{...devices['Desktop Safari'],viewport:{width:1280,height:720}}},{name:'chrome',use:{channel:'chrome',viewport:{width:1280,height:720}}},...(process.env.TEST_EDGE?[{name:'edge',use:{channel:'msedge',viewport:{width:1280,height:720}}}]:[])]
});
