window.NTM_MARKET_CALENDAR = {
  stockholm: {
    timezone: 'Europe/Stockholm',
    regularOpen: '09:00',
    regularClose: '17:30',
    halfDayClose: '13:00',
    years: {
      2027: {
        "status": "known",
        "sourceUrl": "https://www.nasdaq.com/european-market-activity/trading-hours",
        "verifiedAt": "2026-09-13",
        "scope": "equities_regular_session",
        "closed": [
                "2027-01-01",
                "2027-01-06",
                "2027-03-26",
                "2027-03-29",
                "2027-05-06",
                "2027-06-25",
                "2027-12-24",
                "2027-12-31"
        ],
        "halfDays": [
                "2027-01-05",
                "2027-03-25",
                "2027-04-30",
                "2027-05-05",
                "2027-11-05"
        ]
},
      2026: {
        closed: [
          '2026-01-01',
          '2026-01-06',
          '2026-04-03',
          '2026-04-06',
          '2026-05-01',
          '2026-05-14',
          '2026-06-19',
          '2026-12-24',
          '2026-12-25',
          '2026-12-31'
        ],
        halfDays: [
          '2026-01-05',
          '2026-04-02',
          '2026-04-30',
          '2026-05-13',
          '2026-10-30'
        ]
      }
    }
  },
  usa: {
    timezone: 'America/New_York',
    regularOpen: '09:30',
    regularClose: '16:00',
    halfDayClose: '13:00',
    years: {
      2027: {
        "status": "known",
        "sourceUrl": "https://www.nyse.com/trade/hours-calendars",
        "verifiedAt": "2026-09-13",
        "scope": "equities_regular_session",
        "closed": [
                "2027-01-01",
                "2027-01-18",
                "2027-02-15",
                "2027-03-26",
                "2027-05-31",
                "2027-06-18",
                "2027-07-05",
                "2027-09-06",
                "2027-11-25",
                "2027-12-24"
        ],
        "halfDays": [
                "2027-11-26"
        ]
},
      2026: {
        closed: [
          '2026-01-01',
          '2026-01-19',
          '2026-02-16',
          '2026-04-03',
          '2026-05-25',
          '2026-06-19',
          '2026-07-03',
          '2026-09-07',
          '2026-11-26',
          '2026-12-25'
        ],
        halfDays: [
          '2026-11-27',
          '2026-12-24'
        ]
      }
    }
  }
};

