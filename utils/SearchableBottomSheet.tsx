// SearchableBottomSheet.tsx

import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = {
  data: Record<string, any>[];
  labelKey: string;
  title: string;
  onSelect: (item: Record<string, any>) => void;
};

function SearchableBottomSheetInner<T>(
  { data, labelKey, title, onSelect }: Props,
  ref: any,
) {
  const [search, setSearch] = useState("");

  const [contentHeight, setContentHeight] = useState(300);

  const snapPoints = useMemo(
    () => [Math.min(contentHeight, SCREEN_HEIGHT * 0.85)],
    [contentHeight],
  );

  const filtered = data.filter((item) =>
    String(item[labelKey]).toLowerCase().includes(search.toLowerCase()),
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={["50%", "85%"]}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.85}
    >
      <View
        style={styles.container}
        onLayout={(e) => {
          setContentHeight(e.nativeEvent.layout.height);
        }}
      >
        <Text style={styles.title}>{title}</Text>

        <TextInput
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        <FlatList
          data={filtered}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                onSelect(item);
                const bottomSheetRef = ref as React.RefObject<BottomSheet>;
                bottomSheetRef.current?.close();
              }}
            >
              <Text>{String(item[labelKey])}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </BottomSheet>
  );
}

export const SearchableBottomSheet = forwardRef(SearchableBottomSheetInner);

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  search: {
    height: 45,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
});
