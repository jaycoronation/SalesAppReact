import { ShimmerBox } from "@/components/Shimmer";
import {
  DepartmentData,
  DepartmentListResponseModel,
} from "@/Database/models/DepartmentListResponseModel";
import {
  MaterialReportData,
  MaterialReportResponseModel,
} from "@/Database/models/MaterialReportResponseModel";
import { ApiEndPoints } from "@/network/ApiEndPoint";
import { Colors } from "@/utils/colors";
import { Fonts } from "@/utils/fonts";
import { SessionManager } from "@/utils/sessionManager";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MaterialReportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null);

  const [materialReportList, setMaterialReportList] = useState<
    MaterialReportData[]
  >([]);

  // Fetch departments

  const fetchDepartments = useCallback(async () => {
    try {
      const token = await SessionManager.getToken();
      const res = await fetch(ApiEndPoints.DEPARTMENT_LIST, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const responseData: DepartmentListResponseModel = await res.json();
      if (responseData.success === 1 && Array.isArray(responseData.data)) {
        setDepartments(responseData.data);
        if (responseData.data.length > 0) setSelectedDept(responseData.data[0]);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  const fetchMaterialReportData = useCallback(async (deptId: string) => {
    try {
      const token = await SessionManager.getToken();
      const saved = await SessionManager.getDashFilter();
      let month = 0,
        year = 0;

      if (saved) {
        month = saved.month;
        year = saved.year;
      }

      const res = await fetch(
        `${ApiEndPoints.MATERIAL_REPORT_LIST}?dept_id=${deptId}&month=${month}&year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(
        `Display material report url : ${`${ApiEndPoints.MATERIAL_REPORT_LIST}?month=${month}&year=${year}`}`,
      );

      const json: MaterialReportResponseModel = await res.json();
      if (json.success === 1 && Array.isArray(json.data)) {
        setMaterialReportList(json.data);
        console.log(
          `Display material report list length : ${materialReportList.length}`,
        );
      } else {
        setMaterialReportList([]);
      }
    } catch (e) {
      console.log(`Failed to fetch material report : $e`);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDeptSelect = useCallback((dept: DepartmentData) => {
    setSelectedDept(dept);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!selectedDept) return;
    setLoading(true);
    setMaterialReportList([]);
    fetchMaterialReportData(selectedDept.dept_id);
  }, [selectedDept]);

  const onRefresh = useCallback(async () => {
    if (!selectedDept) return;
    setRefreshing(true);
    await fetchMaterialReportData(selectedDept.dept_id);
    setRefreshing(false);
  }, [selectedDept, fetchMaterialReportData]);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: `Material Report`,
          headerShown: true,
          headerBackTitle: "",
          animation: "none",
          headerTintColor: Colors.brandColor,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 4, marginRight: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.deptRow}>
          <Text style={s.deptLabel}>SELECT DEPARTMENT</Text>
          <DeptDropdown
            departments={departments}
            selected={selectedDept}
            onSelect={onDeptSelect}
          />
        </View>

        <Text style={s.topTitle}>{`Department : `}</Text>
        <Text style={s.topTitle}>{`Month : `}</Text>
      </View>

      {/* Report List */}
      <View style={s.tableContainer}>
        {loading ? (
          <ShimmerMaterialReportList />
        ) : (
          <FlatList
            data={materialReportList}
            keyExtractor={(item) => item.material_id}
            renderItem={({ item }) => <Text>{item.material_name}</Text>}
            contentContainerStyle={[s.listContent]}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.brandColor}
              />
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📦</Text>
                <Text style={s.emptyText}>No material report data found</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

//Shimmer Loading
function ShimmerMaterialReportList() {
  return (
    <View style={s.listContent}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={shimmer.wrapper}>
          {/* Top row */}
          <View style={shimmer.top}>
            <ShimmerBox width="60%" height={14} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <ShimmerBox width={30} height={30} borderRadius={8} />
              <ShimmerBox width={30} height={30} borderRadius={8} />
            </View>
          </View>
          {/* Grid cells */}
          <View style={shimmer.grid}>
            {[0, 1, 2, 3].map((j) => (
              <View key={j} style={shimmer.cell}>
                <ShimmerBox
                  width="50%"
                  height={10}
                  style={{ marginBottom: 6 }}
                />
                <ShimmerBox width="70%" height={13} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Department Dropdown ──────────────────────────────────────────────────────

function DeptDropdown({
  departments,
  selected,
  onSelect,
}: {
  departments: DepartmentData[];
  selected: DepartmentData | null;
  onSelect: (dept: DepartmentData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={s.dropdownWrapper}>
      <TouchableOpacity
        style={s.dropdownTrigger}
        activeOpacity={0.8}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={s.dropdownValue}>
          {selected?.dept_name ?? "Select Department"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#6B7280"
        />
      </TouchableOpacity>

      {open && (
        <View style={s.dropdownMenu}>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.dept_id}
              style={[
                s.dropdownItem,
                selected?.dept_id === dept.dept_id && s.dropdownItemActive,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(dept);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  s.dropdownItemText,
                  selected?.dept_id === dept.dept_id &&
                    s.dropdownItemTextActive,
                ]}
              >
                {dept.dept_name}
              </Text>
              {selected?.dept_id === dept.dept_id && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={Colors.brandColor}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const shimmer = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "50%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  topTitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.black,
    marginBottom: 10,
  },

  tableContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  listContent: { flexGrow: 1 },

  footerLoader: { paddingVertical: 16, alignItems: "center" },

  // Empty Data
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  emptyHint: { fontSize: 12, color: "#D1D5DB" },

  // Dept row
  deptRow: { gap: 4 },
  deptLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },

  // Dropdown
  dropdownWrapper: { position: "relative", zIndex: 100 },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 200,
  },
  dropdownValue: { fontSize: 13, fontWeight: "500", color: "#374151" },
  dropdownMenu: {
    position: "absolute",
    top: 40,
    left: 0,
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: { backgroundColor: `${Colors.brandColor}10` },
  dropdownItemText: { fontSize: 13, color: "#374151", fontWeight: "400" },
  dropdownItemTextActive: { color: Colors.brandColor, fontWeight: "600" },
});
