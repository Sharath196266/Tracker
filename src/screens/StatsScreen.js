import React from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import { COLORS } from '../constants/theme';

export default function StatsScreen({ expenses }) {
  // Elegantly curated Golden & Warm Earthy Palette
  const chartColors = [
    '#D4AF37', '#FFDF00', '#C5A059', '#E5C158', '#996515',
    '#B8860B', '#F3E5AB', '#DAA520', '#AA7C11', '#855E42'
  ];

  // 1. Source Breakdown Data
  const sourceTotalsMap = {};
  expenses.forEach((e) => {
    sourceTotalsMap[e.source] = (sourceTotalsMap[e.source] || 0) + e.amount;
  });

  const sourcePieData = Object.keys(sourceTotalsMap).map((src, index) => ({
    name: src,
    population: sourceTotalsMap[src],
    color: chartColors[index % chartColors.length],
    legendFontColor: COLORS.muted,
    legendFontSize: 12,
  }));

  // 2. Category Breakdown Data
  const categoryTotalsMap = {};
  expenses.forEach((e) => {
    categoryTotalsMap[e.category] = (categoryTotalsMap[e.category] || 0) + e.amount;
  });

  const categoryPieData = Object.keys(categoryTotalsMap).map((cat, index) => ({
    name: cat,
    population: categoryTotalsMap[cat],
    color: chartColors[(index + 3) % chartColors.length],
    legendFontColor: COLORS.muted,
    legendFontSize: 12,
  }));

  // 3. Spend Trend Line Data
  const chronological = [...expenses].reverse();
  const lineLabels = chronological.length > 0 
    ? chronological.slice(-6).map((_, idx) => `T${idx + 1}`) 
    : ['T0'];
  const lineData = chronological.length > 0 
    ? chronological.slice(-6).map((e) => e.amount) 
    : [0];

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const screenWidth = Dimensions.get('window').width - 32;

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.screenSubTitle}>Visual Analytics</Text>
        <SummaryCard title="Total Expenditures" amount={grandTotal} />

        {expenses.length > 0 ? (
          <>
            {/* Chart 1: Payment Source Breakdown */}
            <Text style={styles.subHeader}>1. Spend by Source</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={sourcePieData}
                width={screenWidth}
                height={220}
                chartConfig={{ color: () => COLORS.text }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            </View>

            {/* Chart 2: Category Breakdown */}
            <Text style={styles.subHeader}>2. Spend by Category</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={categoryPieData}
                width={screenWidth}
                height={220}
                chartConfig={{ color: () => COLORS.text }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            </View>

            {/* Chart 3: Spend Analysis Line Graph */}
            <Text style={styles.subHeader}>3. Recent Spend Trend</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: lineLabels,
                  datasets: [{ data: lineData }],
                }}
                width={screenWidth}
                height={220}
                chartConfig={{
                  backgroundColor: COLORS.card,
                  backgroundGradientFrom: COLORS.card,
                  backgroundGradientTo: COLORS.card,
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(212, 175, 55, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(161, 161, 166, ${opacity})`,
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: COLORS.primary,
                  },
                }}
                bezier
                style={{ borderRadius: 12 }}
              />
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Log your first transaction to view graphs.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 40 },
  screenSubTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, color: COLORS.text, letterSpacing: 0.5 },
  subHeader: { fontSize: 15, fontWeight: '600', marginTop: 18, marginBottom: 10, color: COLORS.primary },
  chartWrapper: { backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: COLORS.muted, marginTop: 40, fontSize: 14 },
});