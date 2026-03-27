import { dashboardMonthlyTrendAPI, dashboardOverviewAPI, dashboardTopPartiesAPI } from '@/network/authService';
import AppBar from '@/utils/AppBar';
import { AppUtils, getCurrentFinancialYear, getCurrentYear } from '@/utils/AppUtils';
import { Colors } from '@/utils/colors';
import { Fonts } from '@/utils/fonts';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from 'react-native-safe-area-context';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';


export default function DashboardScreen() {
  const router = useRouter();
  const [dashboardCounters, setCounters] = useState<any>({
    sales: {},
    purchase: {},
    payment: {},
    journal: {},
    profit_loss: {},
    gst_reconcile: {}
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [topParties, setTopParties] = useState<[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const monthMap: Record<string, MonthlyData> = {};
  const screenWidth = Dimensions.get("window").width;
  const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient)


  type MonthlyData = {
    month: string;
    sales: number;
    purchase: number;
  };


  useEffect(() => {
    loadDashboard();
    loadDashboardTopParties();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      const res = await dashboardOverviewAPI(
        2,
        getCurrentYear()
      );

      if (res.success && res.data.success === 1) {
        setCounters(res.data.data || {});
        await loadDashboardMonthlyTrend();
      } else {
        await loadDashboardMonthlyTrend();
        AppUtils.showToast(res.data.message || "Failed to load dashboard");
      }
    } catch (error) {
      AppUtils.showToast("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardMonthlyTrend = async () => {
    try {
      const res = await dashboardMonthlyTrendAPI(getCurrentFinancialYear());

      if (res.success && res.data.success === 1) {
        const apiData = res.data.data;

        const sales = apiData.sales || [];
        const purchase = apiData.purchase || [];

        const monthMap: Record<string, MonthlyData> = {};

        sales.forEach((item: any) => {
          const month = item.month;

          if (!monthMap[month]) {
            monthMap[month] = { month, sales: 0, purchase: 0 };
          }

          monthMap[month].sales = parseFloat(item.total_sales);
        });

        purchase.forEach((item: any) => {
          const month = item.month;

          if (!monthMap[month]) {
            monthMap[month] = { month, sales: 0, purchase: 0 };
          }

          monthMap[month].purchase = parseFloat(item.total_purchase);
        });

        const chartData = Object.values(monthMap).sort(
          (a, b) =>
            new Date(a.month).getTime() - new Date(b.month).getTime()
        );

        setMonthlyTrend(chartData || []);
      }
    } catch (error) {
      AppUtils.showToast("Something went wrong");
    }
  };


  //vendor and customer API

  const loadDashboardTopParties = async () => {
    try {
      setIsLoading(true);

      const res = await dashboardTopPartiesAPI(
        2,
        getCurrentYear()
      );

      if (res.success && res.data.success === 1) {
        setTopParties(res.data.data || {});
      } else {
        AppUtils.showToast(res.data.message || "Failed to load dashboard");
      }
    } catch (error) {
      AppUtils.showToast("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };



  const DashboardShimmer = () => {
    return (
      <View style={{ padding: 16 }}>

        {/* Title */}
        <ShimmerPlaceholder style={{ width: 150, height: 20, marginBottom: 20 }} />

        {/* Cards */}
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ marginBottom: 20 }}>

            <ShimmerPlaceholder style={{ width: "100%", height: 120, borderRadius: 12 }} />

            <View style={{ marginTop: 10 }}>
              <ShimmerPlaceholder style={{ width: "60%", height: 15, marginBottom: 8 }} />
              <ShimmerPlaceholder style={{ width: "40%", height: 15 }} />
            </View>

          </View>
        ))}

        {/* Chart */}
        <ShimmerPlaceholder style={{ width: "100%", height: 220, borderRadius: 12 }} />

      </View>
    );
  };



  return (
    <SafeAreaView>
      {isLoading
        ? <DashboardShimmer />
        : <View>
          <AppBar title="Dashboard" />

          <ScrollView style={{ width: '100%' }}>

            <View style={styles.designContainer}>
              <Text style={styles.titleContaier}>Dashboard Overview</Text>

              <View style={styles.innerContainer}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Total Sales</Text>
                    <Text style={styles.amount}>{dashboardCounters?.sales?.total_sales ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>IGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.sales?.igst_collected ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>CGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.sales?.cgst_collected ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>SGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.sales?.sgst_collected ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Total Invoices</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.sales?.total_invoices ?? "₹ 0"}</Text>
                </View>
              </View>

              <View style={styles.innerContainerGreen}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Total Purchase</Text>
                    <Text style={styles.amount}>{dashboardCounters?.purchase?.total_purchase ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>IGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.purchase?.igst_paid ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>CGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.purchase?.cgst_paid ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>SGST Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.purchase?.sgst_paid ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Total Invoices</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.purchase?.total_bills ?? "₹ 0"}</Text>
                </View>
              </View>

              <View style={styles.innerContainerCream}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Profile/Loss</Text>
                    <Text style={styles.amount}>{dashboardCounters?.profit_loss?.net ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Gross Sales</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.profit_loss?.gross_sales ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Gross Purchase</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.profit_loss?.gross_purchase ?? "₹ 0"}</Text>
                </View>

              </View>

              <View style={styles.innerContainerPink}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Gst Reconcile</Text>
                    <Text style={styles.amount}>{dashboardCounters?.gst_reconcile?.total_paid ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Gst Collected</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.gst_reconcile?.gst_collected ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Gst Paid</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.gst_reconcile?.gst_paid ?? "₹ 0"}</Text>
                </View>
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Net Gst Liability</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.gst_reconcile?.net_gst_liability ?? "₹ 0"}</Text>
                </View>
              </View>

              <View style={styles.innerContainer}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Payment</Text>
                    <Text style={styles.amount}>{dashboardCounters?.payment?.total_paid ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Total Vouchers</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.payment?.total_vouchers ?? "₹ 0"}</Text>
                </View>
              </View>

            </View>

            <View style={styles.designContainer2}>
              <Text style={styles.titleContaier}>Cash Risk & Payment Control</Text>

              <View style={styles.innerContainer}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Journal</Text>
                    <Text style={styles.amount}>{dashboardCounters?.journal?.total_pf ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Total Tds Payable</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.journal?.total_tds_payable ?? "₹ 0"}</Text>
                </View>
              </View>


              <View style={styles.innerContainerPink}>
                <View style={styles.flexInnerContainer}>
                  <View>
                    <Text style={styles.innerTitle}>Payment</Text>
                    <Text style={styles.amount}>{dashboardCounters?.payment?.total_paid ?? "₹ 0"}</Text>
                  </View>
                  <Text style={styles.innerTitle}>img</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.innerContainerFlex}>
                  <Text style={styles.titleComman}>Total Vouchers</Text>
                  <Text style={styles.titleComman}>{dashboardCounters?.payment?.total_vouchers ?? "₹ 0"}</Text>
                </View>
              </View>


            </View>

            {monthlyTrend.length > 0 && (
              <LineChart
                data={{
                  labels: monthlyTrend.map(item => item.month),
                  datasets: [
                    {
                      data: monthlyTrend.map(item => item.sales),
                      color: () => "green",
                      strokeWidth: 2
                    },
                    {
                      data: monthlyTrend.map(item => item.purchase),
                      color: () => "blue",
                      strokeWidth: 2
                    }
                  ],
                  legend: ["Sales", "Purchase"]
                }}
                width={screenWidth}
                height={220}
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  labelColor: () => Colors.black,
                  decimalPlaces: 0,
                  color: () => Colors.lightBlue
                }}
              />
            )}
          </ScrollView>
        </View>}
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 20,
    fontFamily: Fonts.regular,
    color: Colors.black,
    paddingTop: 8,
  },
  titleComman: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
    color: Colors.divider,
    borderColor: Colors.divider,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
    // paddingTop: 48,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 16,
  },
  titleContaier: {
    borderColor: Colors.black,
    fontFamily: Fonts.regular,
    fontSize: 16,
    textAlign: 'left',
  },
  designContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.4,
    // shadowRadius: 16,
    // elevation: 8,
    borderWidth: 0.5,
    borderColor: Colors.divider,
    fontFamily: Fonts.medium,
  },
  designContainer2: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    paddingTop: 20,
    marginTop: 16,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.4,
    // shadowRadius: 16,
    // elevation: 8,
    borderWidth: 0.5,
    borderColor: Colors.divider,
    fontFamily: Fonts.medium,
  },
  innerContainer: {
    width: '100%',
    backgroundColor: Colors.lightBlue,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.lightBlue,
    fontFamily: Fonts.medium,
  },

  innerContainerCream: {
    width: '100%',
    backgroundColor: Colors.lightCream,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.lightCream,
    fontFamily: Fonts.medium,
  },

  innerContainerPink: {
    width: '100%',
    backgroundColor: Colors.lightPink,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.lightPink,
    fontFamily: Fonts.medium,
  },


  innerContainerGreen: {
    width: '100%',
    backgroundColor: Colors.lightGreen,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.lightGreen,
    fontFamily: Fonts.medium,
  },


  innerTitle: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: Fonts.medium,
  },
  flexInnerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  innerContainerFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});


