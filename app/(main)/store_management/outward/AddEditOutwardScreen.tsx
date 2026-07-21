import { CommonResponseModel } from "@/Database/models/CommonResponseModel";
import {
  DepartmentData,
  DepartmentListResponseModel,
} from "@/Database/models/DepartmentListResponseModel";
import {
  MaterialListData,
  MaterialListResponseModel,
} from "@/Database/models/MaterialListResponseModel";
import { OutwardListData } from "@/Database/models/OutwardListResponseModel";
import { ApiEndPoints } from "@/network/ApiEndPoint";
import { Colors } from "@/utils/colors";
import { SessionManager } from "@/utils/sessionManager";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

function Toast({
  message,
  type,
  visible,
}: {
  message: string;
  type: ToastType;
  visible: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[s.toast, type === "success" ? s.toastSuccess : s.toastError, { opacity }]}
    >
      <Ionicons
        name={type === "success" ? "checkmark-circle" : "alert-circle"}
        size={18}
        color="#fff"
      />
      <Text style={s.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Field wrapper (matches PartyUpdateScreen) ────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.required}> *</Text>}
      </Text>
      {children}
      {!!error && <Text style={s.errorMsg}>{error}</Text>}
    </View>
  );
}

// ─── Searchable BottomSheet ───────────────────────────────────────────────────

interface SearchableBottomSheetProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  selectedItem: T | null;
  labelKey: keyof T;
  onSelect: (item: T) => void;
}

function SearchableBottomSheet<T>({
  visible,
  onClose,
  title,
  items,
  selectedItem,
  labelKey,
  onSelect,
}: SearchableBottomSheetProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (visible) setSearchQuery("");
  }, [visible]);

  const filteredItems = items.filter((item) =>
    String(item[labelKey]).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.modalDismissArea} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.bottomSheetContainer}>
            <TouchableOpacity style={s.sheetHandleWrap} onPress={onClose} activeOpacity={1}>
              <View style={s.sheetHandle} />
            </TouchableOpacity>

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select {title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View style={s.searchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder={`Search ${title.toLowerCase()}...`}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={(_, idx) => idx.toString()}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
              style={s.listStyleDialog}
              ListEmptyComponent={
                <View style={s.emptyContainer}>
                  <Text style={s.emptyText}>No matching data found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected =
                  JSON.stringify(item) === JSON.stringify(selectedItem);
                return (
                  <TouchableOpacity
                    style={[s.dropdownItem, isSelected && s.dropdownItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                      Keyboard.dismiss();
                    }}
                  >
                    <Text
                      style={[
                        s.dropdownItemText,
                        isSelected && s.dropdownItemTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      {String(item[labelKey])}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={Colors.brandColor} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Select Field ─────────────────────────────────────────────────────────────

function SelectField<T>({
  label,
  required,
  placeholder,
  items,
  selected,
  labelKey,
  onSelect,
  loading,
  error,
  disabled,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  items: T[];
  selected: T | null;
  labelKey: keyof T;
  onSelect: (item: T) => void;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Field label={label} required={required} error={error}>
      <TouchableOpacity
        style={[s.selectTrigger, error ? s.inputError : null, disabled && s.inputDisabled]}
        activeOpacity={0.8}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={[s.selectValue, !selected && s.placeholder]} numberOfLines={1}>
          {selected ? String(selected[labelKey]) : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.brandColor} />
        ) : (
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        )}
      </TouchableOpacity>

      <SearchableBottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        items={items}
        selectedItem={selected}
        labelKey={labelKey}
        onSelect={onSelect}
      />
    </Field>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddEditOutwardScreen() {
  const params = useLocalSearchParams<{ item?: string }>();
  const item: OutwardListData = params.item ? JSON.parse(params.item) : null;
  const isEdit = !!item?.outward_id;

  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null);
  const [deptLoading, setDeptLoading] = useState(true);

  const [materials, setMaterials] = useState<MaterialListData[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialListData | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);

  const [qty, setQty] = useState<string>(item?.qty ?? "");
  const [rate, setRate] = useState<string>("");
  const [value, setValue] = useState<string>(item?.value ?? "");
  const [issuedTo, setIssuedTo] = useState<string>(item?.issued_to ?? "");
  const [remarks, setRemarks] = useState<string>(item?.remarks ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(
    null,
  );

  const qtyRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);
  const issuedToRef = useRef<TextInput>(null);
  const remarksRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      const token = await SessionManager.getToken();
      const res = await fetch(ApiEndPoints.DEPARTMENT_LIST, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json: DepartmentListResponseModel = await res.json();
      if (json.success === 1) {
        setDepartments(json.data);
        if (isEdit && item?.dept_id) {
          const dept = json.data.find((d: DepartmentData) => d.dept_id === item.dept_id);
          if (dept) setSelectedDept(dept);
        }
      }
    } catch {
      showToast("Failed to load departments", "error");
    } finally {
      setDeptLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedDept) return;
    fetchMaterials(selectedDept.dept_id);
  }, [selectedDept]);

  async function fetchMaterials(dept_id: string) {
    setMaterialLoading(true);
    setSelectedMaterial(null);
    try {
      const token = await SessionManager.getToken();
      const res = await fetch(`${ApiEndPoints.MATERIAL_LIST}?dept_id=${dept_id}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json: MaterialListResponseModel = await res.json();
      if (json.success === 1) {
        setMaterials(json.data);
        if (isEdit && item?.material_id) {
          const mat = json.data.find(
            (m: MaterialListData) => m.material_id === item.material_id,
          );
          if (mat) {
            setSelectedMaterial(mat);
            setRate(mat.rate);
          }
        }
      }
    } catch {
      showToast("Failed to load materials", "error");
    } finally {
      setMaterialLoading(false);
    }
  }

  function onMaterialSelect(mat: MaterialListData) {
    setSelectedMaterial(mat);
    setRate(mat.rate);
    if (qty && !isNaN(parseFloat(qty))) {
      setValue((parseFloat(qty) * parseFloat(mat.rate)).toFixed(2));
    }
    clearError("material");
    clearError("rate");
  }

  function onQtyChange(text: string) {
    setQty(text);
    clearError("qty");
    const q = parseFloat(text);
    const r = parseFloat(rate);
    if (!isNaN(q) && !isNaN(r)) setValue((q * r).toFixed(2));
    else setValue("");
  }

  function onRateChange(text: string) {
    setRate(text);
    clearError("rate");
    const q = parseFloat(qty);
    const r = parseFloat(text);
    if (!isNaN(q) && !isNaN(r)) setValue((q * r).toFixed(2));
    else setValue("");
  }

  function clearError(key: string) {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!selectedDept) e.dept = "Please select a department";
    if (!selectedMaterial) e.material = "Please select a material";
    if (!qty.trim()) e.qty = "Quantity is required";
    else if (isNaN(parseFloat(qty)) || parseFloat(qty) <= 0) e.qty = "Enter a valid quantity";
    if (!rate.trim()) e.rate = "Rate is required";
    else if (isNaN(parseFloat(rate)) || parseFloat(rate) < 0) e.rate = "Enter a valid rate";
    if (!issuedTo.trim()) e.issuedTo = "Issued To is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!validate()) return;

    setLoading(true);
    try {

      const saved = await SessionManager.getDashFilter();
      let month = 0;
      let year = 0;
      if (saved) {
        month = saved.month;
        year = saved.year;
      }

      const body: Record<string, string> = {
        dept_id: selectedDept!.dept_id,
        material_id: selectedMaterial!.material_id,
        qty: qty.trim(),
        rate: parseFloat(rate).toFixed(2),
        value: value || (parseFloat(qty) * parseFloat(rate)).toFixed(2),
        issued_to: issuedTo.trim(),
        remarks: remarks.trim(),
        month: month.toString(),
        year: year.toString(),
      };
      if (isEdit) body.outward_id = item.outward_id;

      const token = await SessionManager.getToken();
      const res = await fetch(ApiEndPoints.ADD_OUTWARD, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: CommonResponseModel = await res.json();
      if (json.success === 1) {
        router.back();
        showToast(
          json.message ??
          `${isEdit ? "Update Outward Successfully" : "Add Outward Successfully"}`,
          "success",
        );
      } else {
        showToast(json.message ?? "Something went wrong", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: ToastType) {
    setToast({ message, type, key: Date.now() });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: isEdit ? "Edit Outward" : "Add New Outward",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: Colors.brandColor,
          animation: "none",
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

      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Selection ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Material Selection</Text>

          <SelectField
            label="Department"
            required
            placeholder="Select department"
            items={departments}
            selected={selectedDept}
            labelKey="dept_name"
            onSelect={(dept) => {
              setSelectedDept(dept);
              setSelectedMaterial(null);
              clearError("dept");
            }}
            loading={deptLoading}
            error={errors.dept}
          />

          <SelectField
            label="Material"
            required
            placeholder={selectedDept ? "Select material" : "Select department first"}
            items={materials}
            selected={selectedMaterial}
            labelKey="material_name"
            onSelect={onMaterialSelect}
            loading={materialLoading}
            error={errors.material}
            disabled={!selectedDept || materialLoading}
          />
        </View>

        {/* ── Quantity & Rate ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quantity & Rate</Text>

          <View style={s.row2}>
            <Field label="Quantity" required error={errors.qty}>
              <View style={s.flex1}>
                <TextInput
                  ref={qtyRef}
                  style={[s.input, errors.qty ? s.inputError : null]}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={qty}
                  onChangeText={onQtyChange}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => rateRef.current?.focus()}
                />
              </View>
            </Field>

            <Field label="Rate" required error={errors.rate}>
              <View style={s.flex1}>
                <TextInput
                  ref={rateRef}
                  style={[s.input, errors.rate ? s.inputError : null]}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={rate}
                  onChangeText={onRateChange}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => issuedToRef.current?.focus()}
                />
              </View>
            </Field>
          </View>

          <Field label="Value (Auto-calculated)">
            <View style={s.valueBox}>
              <Text style={[s.valueText, !value && s.placeholder]}>{value || "0.00"}</Text>
            </View>
          </Field>
        </View>

        {/* ── Dispatch Info ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dispatch Details</Text>

          <Field label="Issued To" required error={errors.issuedTo}>
            <TextInput
              ref={issuedToRef}
              style={[s.input, errors.issuedTo ? s.inputError : null]}
              placeholder="Enter issued to"
              placeholderTextColor="#9CA3AF"
              value={issuedTo}
              onChangeText={(text) => {
                setIssuedTo(text);
                clearError("issuedTo");
              }}
              returnKeyType="next"
              onSubmitEditing={() => remarksRef.current?.focus()}
            />
          </Field>

          <Field label="Remarks">
            <TextInput
              ref={remarksRef}
              style={[s.input, s.inputMultiline]}
              placeholder="Enter remarks (optional)"
              placeholderTextColor="#9CA3AF"
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
            />
          </Field>
        </View>

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, loading && s.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>{isEdit ? "Update Entry" : "Add Entry"}</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer} />
      </ScrollView>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} visible />}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  footer: { height: 32 },

  // Section
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  // Field
  field: { gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  required: { color: "#EF4444" },
  errorMsg: { fontSize: 11, color: "#EF4444", marginTop: 2 },

  // Input
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  inputDisabled: { backgroundColor: "#F3F4F6", opacity: 0.6 },
  inputMultiline: { height: 88, paddingTop: 10 },
  placeholder: { color: "#9CA3AF" },

  // Select trigger
  selectTrigger: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: { fontSize: 14, color: "#111827", flex: 1, marginRight: 8 },

  // Value box (read-only)
  valueBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
  },
  valueText: { fontSize: 14, color: "#111827", fontWeight: "600" },

  // Two-column row
  row2: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },

  // Save button
  saveBtn: {
    backgroundColor: Colors.brandColor,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: Colors.brandColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.2 },

  // ── BottomSheet ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalDismissArea: { flex: 1 },
  bottomSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    width: "100%",
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  sheetHandleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  listStyleDialog: { flexGrow: 0 },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 0 },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: { backgroundColor: `${Colors.brandColor}12` },
  dropdownItemText: { fontSize: 14, color: "#374151", flex: 1, marginRight: 8 },
  dropdownItemTextActive: { color: Colors.brandColor, fontWeight: "600" },
  emptyContainer: { padding: 30, alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 14 },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  toastSuccess: { backgroundColor: "#16A34A" },
  toastError: { backgroundColor: "#DC2626" },
  toastText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
});