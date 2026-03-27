import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import DashboardOverview from "./DashboardOverview";
import migrations from './migrations'; // ← import
import DashboardOverviewV2 from './models/dashboardoverview';
import MonthlyTrend from "./models/MonthlyTrend";
import Party from "./models/Party";
import PartyDetail from "./models/Partydetails";
import PaymentEntry from "./models/PaymentEntry";
import PurchaseDetail from "./models/Purchasedetail";
import PurchaseEntry from "./models/PurchaseEntry";
import PurchaseRegisterEntry from './models/Purchaseregisterentry';
import SalesDetail from "./models/SalesDetail";
import SaleEntry from "./models/SalesEntry";
import SalesRegisterEntry from './models/SalesRegisterEntry';
import TopParty from "./models/TopParty";
import UpcomingPayment from './models/Upcomingpayment';
import schema from "./schema";


const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: "SalesAppDB",
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
    PurchaseRegisterEntry,
    SalesRegisterEntry,
    SaleEntry,
    SalesDetail,
    PaymentEntry,
    Party,
    PartyDetail,
    UpcomingPayment,
  ],
})