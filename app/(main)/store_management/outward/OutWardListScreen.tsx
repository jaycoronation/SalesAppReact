import { ShimmerBox } from "@/components/Shimmer";
import { CommonResponseModel } from "@/Database/models/CommonResponseModel";
import {
  DepartmentData,
  DepartmentListResponseModel,
} from "@/Database/models/DepartmentListResponseModel";
import {
  OutwardListData,
  OutwardListResponseModel,
} from "@/Database/models/OutwardListResponseModel";
import { ApiEndPoints } from "@/network/ApiEndPoint";
import { Colors } from "@/utils/colors";
import { SessionManager } from "@/utils/sessionManager";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { SquarePen, Trash } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 50;

// ─── Shimmer Loading ──────────────────────────────────────────────────────────

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

function ShimmerMaterialList() {
  return (
    <View style={s.listContent}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={shimmer.wrapper}>
          <View style={shimmer.top}>
            <ShimmerBox width="60%" height={14} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <ShimmerBox width={30} height={30} borderRadius={8} />
              <ShimmerBox width={30} height={30} borderRadius={8} />
            </View>
          </View>
          <View style={shimmer.grid}>
            {[0, 1, 2, 3].map((j) => (
              <View key={j} style={shimmer.cell}>
                <ShimmerBox width="50%" height={10} style={{ marginBottom: 6 }} />
                <ShimmerBox width="70%" height={13} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Material Row ─────────────────────────────────────────────────────────────

// function MaterialRow({
//   item,
//   onEdit,
//   onDelete,
// }: {
//   item: OutwardListData;
//   onEdit: (item: OutwardListData) => void;
//   onDelete: (item: OutwardListData) => void;
// }) {
//   return (
//     <View
//       style={{
//         alignItems: "flex-start",
//         paddingHorizontal: 16,
//         paddingVertical: 13,
//         borderBottomWidth: 0.5,
//         borderBottomColor: "#E5E7EB",
//         backgroundColor: "#FFFFFF",
//       }}
//     >
//       <View style={{ flexDirection: "row", marginBottom: 8 }}>
//         <View style={{ flex: 1, marginRight: 10 }}>
//           <Text style={s.materialName}>{item.material_name}</Text>
//         </View>

//         <TouchableOpacity
//           style={s.editBtn}
//           activeOpacity={0.7}
//           onPress={() => onEdit(item)}
//         >
//           <SquarePen size={20} color="#6B7280" />
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={s.deleteBtn}
//           activeOpacity={0.7}
//           onPress={() => onDelete(item)}
//         >
//           <Trash size={20} color="#6B7280" />
//         </TouchableOpacity>
//       </View>

//       <View style={{ flexDirection: "row", marginBottom: 8, gap: 4 }}>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Department
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {item.dept_name ?? "-"}
//           </Text>
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Qty
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {item.qty ?? "-"}
//           </Text>
//         </View>
//       </View>

//       <View style={{ flexDirection: "row", marginBottom: 8, gap: 4 }}>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Rate (₹)
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {fmtRate(item.rate ?? "-")}
//           </Text>
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Value
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {item.value ?? "-"}
//           </Text>
//         </View>
//       </View>

//       <View style={{ flexDirection: "row", marginBottom: 8, gap: 4 }}>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Issued To
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {item.issued_to ?? "-"}
//           </Text>
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text
//             style={{
//               fontSize: 12,
//               color: Colors.placeholder,
//               fontWeight: "500",
//             }}
//           >
//             Remark
//           </Text>
//           <View style={{ marginBottom: 4 }} />
//           <Text
//             style={{ fontSize: 12, color: Colors.black, fontWeight: "500" }}
//           >
//             {item.remarks}
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

function MaterialRow({ item, onEdit, onDelete }: {
  item: OutwardListData;
  onEdit: (item: OutwardListData) => void;
  onDelete: (item: OutwardListData) => void;
}) {
  return (
    <View style={row.wrapper}>
      {/* Top: name + action icons */}
      <View style={row.top}>
        <Text style={row.name} numberOfLines={2}>{item.material_name}</Text>
        <View style={row.actions}>
          <TouchableOpacity
            style={row.iconBtn}
            activeOpacity={0.7}
            onPress={() => onEdit(item)}
          >
            <SquarePen size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[row.iconBtn, row.iconBtnDanger]}
            activeOpacity={0.7}
            onPress={() => onDelete(item)}
          >
            <Trash size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid: 2-column field cells */}
      <View style={row.grid}>
        {[
          { label: 'Department', value: item.dept_name ?? '—', isDept: true },
          { label: 'Qty', value: item.qty ?? '—' },
          { label: 'Rate (₹)', value: fmtRate(item.rate ?? ''), isRate: true },
          { label: 'Value', value: item.value ?? '—' },
          { label: 'Issued To', value: item.issued_to ?? '—' },
          { label: 'Remark', value: item.remarks ?? '—' },
        ].map((f, i, arr) => (
          <View
            key={f.label}
            style={[
              row.cell,
              i % 2 === 1 && row.cellNoBorderRight,
              i >= arr.length - 2 && row.cellNoBorderBottom,
            ]}
          >
            <Text style={row.cellLabel}>{f.label}</Text>
            {f.isDept ? (
              <View style={row.deptBadge}>
                <Text style={row.deptBadgeText}>{f.value}</Text>
              </View>
            ) : (
              <Text style={[row.cellValue, f.isRate && row.rateValue]}>
                {f.value}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0, marginTop: 1 },
  iconBtn: {
    width: 30, height: 30,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '50%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    borderRightWidth: 0.5,
    borderRightColor: '#F3F4F6',
  },
  cellNoBorderRight: { borderRightWidth: 0 },
  cellNoBorderBottom: { borderBottomWidth: 0 },
  cellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cellValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  rateValue: { color: '#059669', fontWeight: '600' },
  deptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.brandColorLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 1,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
  },
  deptBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.brandColor },
});

function fmtRate(v: string) {
  const n = parseFloat(v);
  if (!v || isNaN(n)) return "—";
  return `₹${n.toFixed(2)}`;
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OutWardListScreen() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null);

  const [inwardList, setInwardList] = useState<OutwardListData[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OutwardListData | null>(
    null,
  );

  const isFetchingRef = useRef(false);

  // ── Fetch departments ──────────────────────────────────────────────────────

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

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const responseData: DepartmentListResponseModel = await res.json();

      console.log("Department Response:", responseData);

      if (responseData.success === 1 && Array.isArray(responseData.data)) {
        setDepartments(responseData.data);

        if (responseData.data.length > 0) {
          setSelectedDept(responseData.data[0]);
        }
      } else {
        console.warn("No department data found");
        setDepartments([]);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  // ── Fetch materials ────────────────────────────────────────────────────────

  const fetchOutward = useCallback(
    async (deptId: string, pageNum: number, reset = false) => {
      setTotalRecords(0);
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const token = await SessionManager.getToken();

        const saved = await SessionManager.getDashFilter();
        let month = 0;
        let year = 0;
        if (saved) {
          month = saved.month;
          year = saved.year;
        }

        const res = await fetch(
          `${ApiEndPoints.OUTWARD_LIST}?page=${pageNum}&limit=${PAGE_LIMIT}&dept_id=${deptId}&month=${month}&year=${year}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        const json: OutwardListResponseModel = await res.json();
        console.log("Outward Response:", json);

        if (json.success === 1 && Array.isArray(json.data)) {
          setTotalRecords(json.totalRecords ?? 0);
          setInwardList((prev) =>
            reset ? json.data : [...prev, ...json.data],
          );
          setHasMore(json.data.length === PAGE_LIMIT);
        }
      } catch (e) {
        console.error("Failed to fetch materials", e);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ── Delete Dialog ───────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      const token = await SessionManager.getToken();

      const body: Record<string, string> = {
        outward_id: `${selectedItem.outward_id}`,
      };

      const response = await fetch(`${ApiEndPoints.DELETE_OUTWARD}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json: CommonResponseModel = await response.json();

      if (json.success === 1) {
        setInwardList((prev) =>
          prev.filter((item) => item.outward_id !== selectedItem.outward_id),
        );
      }
    } catch (error) {
      console.log("Delete Error:", error);
    } finally {
      setDeleteSheetVisible(false);
      setSelectedItem(null);
    }
  };

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!selectedDept) return;
    setLoading(true);
    setPage(1);
    setInwardList([]);
    fetchOutward(selectedDept.dept_id, 1, true);
  }, [selectedDept]);

  // ── Reload list when screen comes back into focus (after add/edit) ──────────

  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Skip the very first focus (initial mount — already handled above)
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (!selectedDept) return;
      setRefreshing(true);
      setPage(1);
      fetchOutward(selectedDept.dept_id, 1, true);
    }, [selectedDept, fetchOutward]),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    if (!selectedDept) return;
    setRefreshing(true);
    setPage(1);
    fetchOutward(selectedDept.dept_id, 1, true);
  }, [selectedDept, fetchOutward]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || !selectedDept) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchOutward(selectedDept.dept_id, nextPage);
  }, [hasMore, loadingMore, selectedDept, page, fetchOutward]);

  const onDeptSelect = useCallback((dept: DepartmentData) => {
    setSelectedDept(dept);
    setSearch("");
  }, []);

  const onEditMaterial = useCallback((item: OutwardListData) => {
    router.push({
      pathname: "/(main)/store_management/outward/AddEditOutwardScreen",
      params: { item: JSON.stringify(item) },
    });
  }, []);

  const onDeleteMaterial = useCallback((item: OutwardListData) => {
    setSelectedItem(item);
    setDeleteSheetVisible(true);
  }, []);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filtered = search.trim()
    ? inwardList.filter((m) =>
      m.material_name.toLowerCase().includes(search.toLowerCase()),
    )
    : inwardList;

  // ── List header ────────────────────────────────────────────────────────────

  const ListHeader = (
    <View style={s.tableHeader}>
      <Text style={[s.tableHeaderText, { flex: 1 }]}>MATERIAL NAME</Text>
      <Text style={[s.tableHeaderText, s.tableHeaderRate]}>RATE</Text>
      <Text style={[s.tableHeaderText, s.tableHeaderAction]}>ACTIONS</Text>
    </View>
  );

  // ── Footer loader ──────────────────────────────────────────────────────────

  const ListFooter = loadingMore ? (
    <View style={s.footerLoader}>
      <ActivityIndicator size="small" color={Colors.brandColor} />
    </View>
  ) : (
    <View style={{ height: 40 }} />
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: `Outward (${totalRecords})`,
          headerShown: true,
          headerBackTitle: "",
          animation: "none",
          headerTintColor: Colors.brandColor,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <View style={s.topBarRight}>
            {/* Search */}
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={s.searchInput}
                placeholder="Search outward..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Add */}
            <TouchableOpacity
              style={s.addBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname:
                    "/(main)/store_management/outward/AddEditOutwardScreen",
                })
              }
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={s.addBtnText}>Add Outward</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Dept dropdown */}
        <View style={s.deptRow}>
          <Text style={s.deptLabel}>SELECT DEPARTMENT</Text>
          <DeptDropdown
            departments={departments}
            selected={selectedDept}
            onSelect={onDeptSelect}
          />
        </View>
      </View>

      {/* ── List ── */}
      <View style={s.tableContainer}>
        {loading ? (
          <ShimmerMaterialList />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.material_id}
            renderItem={({ item }) => (
              <MaterialRow
                item={item}
                onEdit={onEditMaterial}
                onDelete={onDeleteMaterial}
              />
            )}
            // ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            contentContainerStyle={[
              s.listContent,
              filtered.length === 0 && { flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={onEndReached}
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
                <Text style={s.emptyText}>No outward found</Text>
                {search.length > 0 && (
                  <Text style={s.emptyHint}>Try a different search term</Text>
                )}
              </View>
            }
          />
        )}
      </View>
      <Modal
        visible={deleteSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteSheetVisible(false)}
      >
        <Pressable style={del.overlay} onPress={() => setDeleteSheetVisible(false)}>
          <Pressable style={del.sheet}>
            <View style={del.handle} />

            <View style={del.iconWrap}>
              <Trash size={20} color="#EF4444" />
            </View>

            <Text style={del.title}>Delete outward entry?</Text>
            <Text style={del.sub}>This action cannot be undone.</Text>

            {selectedItem && (
              <View style={del.preview}>
                <View style={del.previewDot} />
                <View style={{ flex: 1 }}>
                  <Text style={del.previewName} numberOfLines={1}>
                    {selectedItem.material_name}
                  </Text>
                  <Text style={del.previewMeta}>
                    {selectedItem.dept_name}
                    {selectedItem.qty ? ` · ${selectedItem.qty}` : ''}
                    {selectedItem.rate ? ` · ${fmtRate(selectedItem.rate)}` : ''}
                  </Text>
                </View>
              </View>
            )}

            <View style={del.btnRow}>
              <TouchableOpacity
                style={del.cancelBtn}
                onPress={() => setDeleteSheetVisible(false)}
              >
                <Text style={del.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={del.deleteBtn} onPress={confirmDelete}>
                <Text style={del.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}



const del = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    paddingTop: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 50,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 52,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 22,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#F97316", // Orange theme
  },
  previewName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  previewMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
});
// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
    flexWrap: "wrap",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  countBadge: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flex: 1,
    maxWidth: 240,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.brandColor,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Dept row
  deptRow: { gap: 4 },
  deptLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },

  // ── Dropdown ──────────────────────────────────────────────────────────────
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
  dropdownValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
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

  // ── Table ─────────────────────────────────────────────────────────────────
  tableContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",  // was "#FFFFFF"
    marginTop: 8,
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.6,
  },
  tableHeaderRate: {
    width: 90,
    textAlign: "right",
  },
  tableHeaderAction: {
    width: 72,
    textAlign: "center",
  },

  listContent: {
    flexGrow: 1,
  },

  // ── Row ───────────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  rowLeft: { flex: 1, gap: 4 },
  materialName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  unitPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unitText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3B82F6",
  },
  rate: {
    width: 90,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  editBtn: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
    height: 18,
  },

  deleteBtn: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
    height: 18,
    marginLeft: 8,
  },

  // ── Footer / empty ────────────────────────────────────────────────────────
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  emptyHint: { fontSize: 12, color: "#D1D5DB" },

  //delete
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#FFF",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  sheetMessage: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 10,
    marginBottom: 24,
  },

  sheetButtonRow: {
    flexDirection: "row",
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 8,
  },

  cancelText: {
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
  },

  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },

  deleteText: {
    color: "#FFF",
    fontWeight: "700",
    textAlign: "center",
  },
});
