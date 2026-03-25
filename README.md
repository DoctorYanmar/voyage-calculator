# VoyageFuel — Voyage Fuel Planning Application

A professional, browser-based fuel planning tool for maritime operations. Replaces Excel-based workflows with a modern, flexible application for voyage fuel consumption planning, bunker management, and tank-by-tank ROB tracking.

---

## Features

### Vessel Setup
- Add, edit, and remove tanks with capacity and initial ROB
- Drag-and-drop to set the global tank consumption order (which tank is drawn first per fuel grade)
- Manage fuel grades (HFO, VLSFO, MGO, MDO, LSMGO — or define custom grades)
- Multiple vessel profiles — switch between vessels instantly from the top navigation

### Voyage Planning
- Add sea passages, port stays, anchorages, canal transits, and drifting legs
- Three fuel consumption modes per leg:
  - **Standard** — one or more fuel grades, each at its own rate, drawn from selected tanks
  - **ECA Zone** — splits the leg by ECA distance; shows HFO (outside) and LSMGO (inside ECA) consumption separately with correct time and tank tracking
  - **Blend Mode** — simultaneous consumption of two or more fuels at a user-defined ratio (e.g. VLSFO 90% + HFO 10%), each drawn from its own tanks concurrently
- Reusable blend definitions in the Blend Library — define once, apply to multiple legs
- Bunker events — record mid-voyage fuel received at any port, replenished to the correct tanks

### Calculations
- Live fuel summary per grade: initial ROB → consumed → final ROB with fill indicators
- Tank-by-tank ROB table with consumption order
- Leg-by-leg breakdown table with expandable detail rows showing:
  - ECA and non-ECA consumption separately
  - Blend per-grade split
  - Bunker events received after each leg
  - Time breakdown (sea / ECA / port hours)
- Automatic warnings when ROB would go insufficient

### Reports
- Full voyage summary in-browser
- **PDF export** — formatted document with all tables, warnings, and calculation details
- **Print** — opens a clean, printer-ready page

### Data Management
- Auto-saves to browser localStorage on every change — no manual save needed
- **Export JSON** — download full state (vessels + voyage) as a portable file
- **Import JSON** — restore from file, works across machines and browsers

---

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) version 18 or higher

### Run on Windows

Double-click `run.bat` or run it from Command Prompt:

```
run.bat
```

### Run on macOS / Linux

Open Terminal in the project folder and run:

```bash
chmod +x run.sh
./run.sh
```

Both scripts will:
1. Check that Node.js is installed
2. Install dependencies (`npm install`) if not already present
3. Start the development server
4. Open the app in your browser at `http://localhost:5173`

### Manual start (any platform)

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## How to Use

### 1. Create a Vessel

Click the vessel selector in the top navigation → **Add new vessel** → enter the vessel name.

### 2. Set Up Tanks

Go to the **Vessel Setup** tab:
- Click **Add Tank** to add each fuel tank
- Set the tank name, fuel grade, capacity, and initial ROB (quantity on board at voyage start)
- Drag rows to set the consumption order — the topmost tank of each grade is drawn first

### 3. Configure Fuel Grades

In the **Vessel Setup** tab → Fuel Grades panel:
- Built-in grades (HFO, VLSFO, MGO) are pre-loaded
- Click the pencil icon to edit a grade's label, sulfur %, or ECA compliance status
- Add custom grades with **Add grade**

### 4. Plan the Voyage

Go to the **Voyage Plan** tab → click **Add Leg**:

| Leg Type | Use for |
|---|---|
| Sea Passage | Open-sea sailing with distance + speed |
| Port Stay | Time alongside at port |
| Anchorage | Waiting at anchor |
| Canal Transit | Canal passage |
| Drifting | Slow steaming or drifting |

**Fuel mode — Standard:**
- Add one or more fuel streams (grade + MT/day rate + which tanks to draw from)
- Use a separate port rate if consumption differs at port

**Fuel mode — ECA Zone** *(sea legs only)*:
- Enable ECA Zone and enter the ECA distance (nm)
- Set the ECA-compliant fuel grade (e.g. LSMGO) and its rate
- The non-ECA portion uses your main fuel streams
- Both consumptions are tracked and displayed separately

**Fuel mode — Blend** *(requires a blend defined in the Blend Library)*:
- Define the blend first: go to **Blend Library**, click **Define blend**
- Set the ratios per fuel grade (must total 100%)
- Apply the blend to a leg and set the total combined rate (MT/day)
- Each grade is deducted simultaneously from its own tanks

**Bunker Events:**
- In the Voyage Plan tab → Bunker Events → **Add bunker**
- Select which leg the fuel was received after, the port, and the quantity per grade

### 5. View Calculations

Go to the **Calculations** tab (default):
- Fuel summary cards show initial, consumed, and final ROB per grade
- The leg breakdown table shows consumption per leg — click any row to expand details
- ECA legs show both fuel types in separate columns
- Blend legs show each grade's share
- Warning badges appear when fuel runs short

### 6. Export Report

Go to the **Report** tab:
- Click **Export PDF** to download a formatted calculation report
- Click **Print** to open a printable page in a new window

### 7. Save and Transfer Data

- Data saves automatically in your browser
- Click **Export** (top navigation) to download a `.json` backup file
- Click **Import** to restore from a `.json` file on another machine

---

## Fuel Consumption Modes — Quick Reference

| Mode | When to use | Example |
|---|---|---|
| Standard | Normal sea or port consumption of one or more fuel types | HFO at 55 MT/day at sea, MGO at 3 MT/day in port |
| ECA Zone | Leg passes through an Emission Control Area | 300 nm total: 250 nm HFO + 50 nm LSMGO |
| Blend | Vessel must burn two fuels simultaneously at a fixed ratio | VLSFO 90% + HFO 10% at 50 MT/day combined |

---

## Project Structure

```
voyage-calculator/
├── src/
│   ├── components/
│   │   ├── calculator/     # Calculations tab (main view)
│   │   ├── layout/         # App shell, top navigation, tabs
│   │   ├── report/         # Report preview and PDF export
│   │   ├── shared/         # Reusable UI components
│   │   ├── vessel/         # Vessel setup tab
│   │   └── voyage/         # Voyage plan tab
│   ├── constants/          # Default fuel grades, labels
│   ├── hooks/              # useCalculations (memoized engine)
│   ├── lib/                # Calculation engine, PDF utils
│   ├── store/              # Zustand state (vessel, voyage, UI)
│   └── types/              # TypeScript interfaces
├── run.bat                 # Windows launcher
├── run.sh                  # macOS / Linux launcher
└── package.json
```

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| TailwindCSS | Styling |
| Zustand | State management |
| @dnd-kit | Drag-and-drop (tank reordering) |
| jsPDF + html2canvas | PDF report generation |
| react-hot-toast | Notifications |
| lucide-react | Icons |

---

## License

MIT License — see [LICENSE](LICENSE)
