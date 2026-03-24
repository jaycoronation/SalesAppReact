import { Database } from "@nozbe/watermelondb"
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs"
import DashboardOverview from "./DashboardOverview"
import DashboardOverviewV2 from './models/dashboardoverview'
import MonthlyTrend from "./models/MonthlyTrend"
import Party from "./models/Party"
import PartyDetail from "./models/Partydetails"
import PaymentEntry from "./models/PaymentEntry"
import PurchaseDetail from "./models/Purchasedetail"
import PurchaseEntry from "./models/PurchaseEntry"
import SalesDetail from "./models/SalesDetail"
import SaleEntry from "./models/SalesEntry"
import TopParty from "./models/TopParty"
import UpcomingPayment from './models/Upcomingpayment'
import schema from "./schema"

// LokiJS adapter — pure JavaScript, no native linking required.
// Works with Expo Go (managed workflow) out of the box.
// For production with a custom dev client, swap this for expo-sqlite adapter.
const adapter = new LokiJSAdapter({
  schema,
  dbName: "SalesAppDB",
  useWebWorker: false,   // must be false in React Native
  useIncrementalIndexedDB: false,
  onSetUpError: (error: Error) => {
    console.error("WatermelonDB setup error:", error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [
    DashboardOverview,
    DashboardOverviewV2,
    MonthlyTrend,
    TopParty,
    PurchaseEntry,
    PurchaseDetail,
    SaleEntry,
    SalesDetail,
    PaymentEntry,
    Party,
    PartyDetail,
    UpcomingPayment,
  ],
})