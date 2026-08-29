// public/js/ui/AdvisorSystem.js
// Kid-Friendly Pedagogical Advisor System for 5th-Grade Socio-Economic Learning

class AdvisorSystem {
  constructor(networkClient) {
    this.network = networkClient;

    this.advisors = {
      UNION_BOSS: {
        name: 'Sal "Wrench" Sullivan',
        title: 'Team Worker Leader & District 3 Boss',
        avatar: '👷‍♂️',
        color: '#ef4444',
        intro: 'Hey there, city builder! I help the workers in our town. When you build, check the "Helper Workers" box! We build your houses three times faster, make sure nobody stops working on strike, and help you get 10 whole years of free taxes from Town Hall!'
      },
      COUNCILWOMAN: {
        name: 'Eleanor Vance',
        title: 'Neighborhood Council Leader',
        avatar: '🏛️',
        color: '#f59e0b',
        intro: 'Welcome to City Hall! Each of the 10 neighborhoods has a leader with a special rule: they can say YES or NO to big factories or floating cities in their area. Earn Respect Points by helping the town so they approve your building projects!'
      },
      BANK_GOVERNOR: {
        name: 'Arthur Sterling',
        title: 'Friendly Town Banker',
        avatar: '🏦',
        color: '#10b981',
        intro: 'Hello! I run the town bank. You can borrow money from our piggy bank to build faster, but watch your Safe Money Meter! Keep it in the green so you always have enough wealth to stay safe from debt.'
      },
      TRADE_AMBASSADOR: {
        name: 'Ambassador Mei-Ling Chen',
        title: 'World Trade Friend',
        avatar: '🌐',
        color: '#06b6d4',
        intro: 'Hello! I travel to other countries to buy Super Floating Crystals and Energy Wire. If another country puts a trade block on crystals, we can sign a peaceful trade treaty or send friendly security patrols to help!'
      },
      ANTIGRAVITY_TECH: {
        name: 'Dr. Aris Thorne',
        title: 'Sky Scientist & Inventor',
        avatar: '🛸',
        color: '#a855f7',
        intro: 'Greetings! I invent Floating Sky Cities that hover high up in the clouds at Z=64! Up in the air, your people escape ground smoke and fly in sky-capsules. Just make sure to feed your sky city floating crystals, or it will gently fall down!'
      }
    };
  }

  // Actionable 5th-grade advice when Safe Money Meter drops into the red
  getMarginCallResolutionOptions(firm, gameState) {
    if (!firm || !firm.marginLoan) return null;

    const loan = firm.marginLoan.borrowedAmount;
    const equity = firm.netWorth;
    const targetEquity = Math.round(loan * 1.30);
    const cashDeficit = Math.max(0, targetEquity - equity);

    return {
      title: '🚨 BANK DEBT ALERT: Safe Money Meter is in the Red!',
      speechText: `Bank debt alert! Your safe money meter dropped to ${firm.calculatedMarginRatio || 95} percent. The bank wants to help you protect your company! Here are three easy choices: Choice A, pay back fifteen thousand dollars to the bank. Choice B, sell some extra company slices. Choice C, bulldoze an unused building. Click any choice below!`,
      explanation: `Your company borrowed money from the bank, and your Safe Money Meter dropped to ${firm.calculatedMarginRatio || 95}%. The bank requires a 110% buffer to keep building. Here is what you can do right now to get back in the green:`,
      options: [
        {
          label: `Choice A: Pay Back Bank Loan ($${cashDeficit > 0 ? cashDeficit.toLocaleString() : '15,000'})`,
          actionDesc: 'Give cash back to the bank to quickly move your Safe Money Meter back to green.',
          actionType: 'REPAY_LOAN',
          amount: cashDeficit > 0 ? cashDeficit : 15000
        },
        {
          label: 'Choice B: Sell Some Extra Company Shares',
          actionDesc: 'Turn shares of other companies into cash to pay off debt.',
          actionType: 'NAVIGATE_STOCKS'
        },
        {
          label: 'Choice C: Bulldoze an Old Building',
          actionDesc: 'Remove an unneeded building so you do not have to pay upkeep costs.',
          actionType: 'INSPECT_PROPERTY'
        }
      ]
    };
  }

  // 5th-grade advice when a neighborhood leader stops a building
  getVetoAdvice(districtId, vetoReason) {
    return {
      title: `🏛️ Neighborhood Leader Rule: District ${districtId}`,
      speechText: `Wait! The neighborhood leader for District ${districtId} stopped this building. In our city, each neighborhood leader can say yes or no to big buildings. You can spend 50 Respect Points to change their mind, ask the City Planning Board, or run for election in this neighborhood!`,
      reason: vetoReason,
      explanation: 'In our city, each neighborhood council leader has the power to protect their neighborhood scale. If they say no to a big factory or sky city, you have three friendly ways to solve it:',
      solutions: [
        '1. ⭐ Spend 50 Respect Points in City Hall to override their rule.',
        '2. ⚖️ Send a request to the 5-member City Planning Board.',
        '3. 🗳️ Run in the next town election to become the neighborhood leader yourself!'
      ]
    };
  }
}

window.AdvisorSystem = AdvisorSystem;
