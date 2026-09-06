const macroWeeks = {
  '2026-W37': {
    sourceTimezone: 'America/New_York',
    events: [
      { date: '2026-09-08', time: '06:00', eventName: 'NFIB Index of Small Business Optimism', period: 'Aug.', forecast: null, previous: '99.8', priority: 'low' },
      { date: '2026-09-08', time: '15:00', eventName: 'Consumer Credit', period: 'Jul.', forecast: null, previous: '142B', priority: 'low' },
      { date: '2026-09-10', time: '08:30', eventName: 'Weekly Jobless Claims', period: 'Sept. 5', forecast: '208K', previous: '206K', priority: 'high' },
      { date: '2026-09-10', time: '08:30', eventName: 'PPI', period: 'Aug.', forecast: '0.4%', previous: '0%', priority: 'high' },
      { date: '2026-09-10', time: '08:30', eventName: 'Ex-Food & Energy PPI, M/M%', period: 'Aug.', forecast: '0.3%', previous: '0.2%', priority: 'high' },
      { date: '2026-09-10', time: '08:30', eventName: 'PPI, Y/Y%', period: 'Aug.', forecast: '5.3%', previous: '4.7%', priority: 'high' },
      { date: '2026-09-10', time: '10:00', eventName: 'Monthly Wholesale Trade', period: 'Jul.', forecast: null, previous: '0.2%', priority: 'low' },
      { date: '2026-09-10', time: '10:00', eventName: 'Existing Home Sales', period: 'Aug.', forecast: '3.9M', previous: '4.1M', priority: 'medium' },
      { date: '2026-09-11', time: '08:30', eventName: 'CPI', period: 'Aug.', forecast: '0.4%', previous: '0.1%', priority: 'high' },
      { date: '2026-09-11', time: '08:30', eventName: 'Core CPI, M/M%', period: 'Aug.', forecast: '0.2%', previous: '0.2%', priority: 'high' },
      { date: '2026-09-11', time: '08:30', eventName: 'CPI, Y/Y%', period: 'Aug.', forecast: '3.4%', previous: '3.4%', priority: 'high' },
      { date: '2026-09-11', time: '08:30', eventName: 'CPI Core, Y/Y%', period: 'Aug.', forecast: '2.4%', previous: '2.5%', priority: 'high' },
      { date: '2026-09-11', time: '10:00', eventName: 'U. Michigan Prelim Consumer Survey', period: 'Sep.', forecast: '52.3', previous: '51', priority: 'medium' },
      { date: '2026-09-11', time: '14:00', eventName: 'Monthly Treasury Balance', period: 'Aug.', forecast: null, previous: '-432B', priority: 'low' }
    ]
  }
};

const earningsWeeks = {
  '2026-W37': {
    reports: [
      { date: '2026-09-08', companyName: 'ABM Industries', ticker: 'ABM', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-08', companyName: 'Canaan', ticker: 'CAN', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-08', companyName: 'United Natural Foods', ticker: 'UNFI', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-08', companyName: "Casey's General Stores", ticker: 'CASY', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-08', companyName: 'Braze', ticker: 'BRZE', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-08', companyName: 'ServiceTitan', ticker: 'TTAN', timing: 'after-close', priority: 'high' },
      { date: '2026-09-08', companyName: 'Mission Produce', ticker: 'AVO', timing: 'after-close', priority: 'low' },
      { date: '2026-09-08', companyName: 'InnovAge', ticker: 'INNV', timing: 'after-close', priority: 'low' },
      { date: '2026-09-09', companyName: 'Chewy', ticker: 'CHWY', timing: 'before-open', priority: 'high' },
      { date: '2026-09-09', companyName: 'Caleres', ticker: 'CAL', timing: 'before-open', priority: 'low' },
      { date: '2026-09-09', companyName: 'SailPoint', ticker: 'SAIL', timing: 'before-open', priority: 'high' },
      { date: '2026-09-09', companyName: 'Nano-X Imaging', ticker: 'NNOX', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Academy Sports + Outdoors', ticker: 'ASO', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Signet Jewelers', ticker: 'SIG', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Core & Main', ticker: 'CNM', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-09', companyName: "Jersey Mike's", ticker: 'JMKE', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-09', companyName: 'J.Jill', ticker: 'JILL', timing: 'before-open', priority: 'low' },
      { date: '2026-09-09', companyName: 'Korn Ferry', ticker: 'KFY', timing: 'before-open', priority: 'low' },
      { date: '2026-09-09', companyName: 'AeroVironment', ticker: 'AVAV', timing: 'after-close', priority: 'high' },
      { date: '2026-09-09', companyName: 'American Eagle Outfitters', ticker: 'AEO', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Navan', ticker: 'NAVN', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Wealthfront', ticker: 'WLTH', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-09', companyName: 'CooperCompanies', ticker: 'COO', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-09', companyName: 'Lakeland Industries', ticker: 'LAKE', timing: 'after-close', priority: 'low' },
      { date: '2026-09-09', companyName: 'Limoneira', ticker: 'LMNR', timing: 'after-close', priority: 'low' },
      { date: '2026-09-09', companyName: 'Lesaka Technologies', ticker: 'LSAK', timing: 'after-close', priority: 'low' },
      { date: '2026-09-09', companyName: 'Gloo', ticker: 'GLOO', timing: 'after-close', priority: 'low' },
      { date: '2026-09-09', companyName: 'Skillsoft', ticker: 'SKIL', timing: 'after-close', priority: 'low' },
      { date: '2026-09-10', companyName: '1-800-Flowers.com', ticker: 'FLWS', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-10', companyName: "Macy's", ticker: 'M', timing: 'before-open', priority: 'high' },
      { date: '2026-09-10', companyName: 'MasterCraft Boat Holdings', ticker: 'MCFT', timing: 'before-open', priority: 'low' },
      { date: '2026-09-10', companyName: 'Designer Brands', ticker: 'DBI', timing: 'before-open', priority: 'low' },
      { date: '2026-09-10', companyName: 'Vince Holding', ticker: 'VNCE', timing: 'before-open', priority: 'low' },
      { date: '2026-09-10', companyName: 'SHOE', ticker: null, timing: 'before-open', priority: 'low' },
      { date: '2026-09-10', companyName: 'The Lovesac Company', ticker: 'LOVE', timing: 'before-open', priority: 'medium' },
      { date: '2026-09-10', companyName: 'Oracle', ticker: 'ORCL', timing: 'after-close', priority: 'high' },
      { date: '2026-09-10', companyName: 'Adobe', ticker: 'ADBE', timing: 'after-close', priority: 'high' },
      { date: '2026-09-10', companyName: 'RH', ticker: 'RH', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-10', companyName: 'Descartes Systems Group', ticker: 'DSGX', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-10', companyName: 'Copart', ticker: 'CPRT', timing: 'after-close', priority: 'high' },
      { date: '2026-09-10', companyName: 'LightPath Technologies', ticker: 'LPTH', timing: 'after-close', priority: 'low' },
      { date: '2026-09-10', companyName: 'Reformation', ticker: 'REF', timing: 'after-close', priority: 'low' },
      { date: '2026-09-10', companyName: 'Alliance Entertainment', ticker: 'AENT', timing: 'after-close', priority: 'low' },
      { date: '2026-09-10', companyName: 'Zumiez', ticker: 'ZUMZ', timing: 'after-close', priority: 'medium' },
      { date: '2026-09-11', companyName: 'Kroger', ticker: 'KR', timing: 'before-open', priority: 'high' },
      { date: '2026-09-11', companyName: 'Hooker Furnishings', ticker: 'HOFT', timing: 'before-open', priority: 'low' },
      { date: '2026-09-11', companyName: 'MoneyHero', ticker: 'MNY', timing: 'before-open', priority: 'low' }
    ]
  }
};

window.NTM_WEEKLY_EVENTS = {
  macroWeeks,
  earningsWeeks,
  macro: macroWeeks['2026-W37'].events,
  earnings: earningsWeeks['2026-W37'].reports
};
