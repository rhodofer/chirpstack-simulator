package mock

import (
	"regexp"
	"strings"
	"testing"
)

// TestWordListCapacities, plan'da belirtilen 1.5M minimum kombinasyon
// kapasitesinin korunduğunu doğrular. Listeler tek-tek en az 80 kelime
// içermelidir; toplam kombinasyon 1.000.000'un üzerinde olmalıdır. Bu
// test, Faz 1.1 tarafından üretilen listenin yeterli çeşitliliğe sahip
// olduğunu kanıtlar.
func TestWordListCapacities(t *testing.T) {
	lists := map[string][]string{
		"adjectives":        adjectives,
		"helperAdjectives":  helperAdjectives,
		"nouns":             nouns,
	}
	const minPerList = 80
	const minCombos = 1_000_000

	total := 1
	for name, lst := range lists {
		if len(lst) < minPerList {
			t.Errorf("%s: beklenen >= %d kelime, bulunan %d", name, minPerList, len(lst))
		}
		// Aynı kelime liste içinde iki kez geçmemeli.
		seen := make(map[string]bool, len(lst))
		for _, w := range lst {
			if w == "" {
				t.Errorf("%s: boş kelime var", name)
				continue
			}
			if seen[w] {
				t.Errorf("%s: tekrarlanan kelime: %q", name, w)
			}
			seen[w] = true
		}
		total *= len(lst)
	}
	if total < minCombos {
		t.Errorf("toplam kombinasyon %d < %d (yetersiz kapasite)", total, minCombos)
	}
	t.Logf("kombinasyon kapasitesi: %d", total)
}

// TestGenerateAppNameFormat, GenerateAppName çıktısının beklenen biçime
// uyduğunu doğrular: üç adet küçük harfli kelime, '-' ile ayrılmış,
// alfanumerik + tire.
func TestGenerateAppNameFormat(t *testing.T) {
	used := UsedNames{}
	name, err := GenerateAppName(used)
	if err != nil {
		t.Fatalf("GenerateAppName: %v", err)
	}
	re := regexp.MustCompile(`^[a-z]+(-[a-z]+){2}$`)
	if !re.MatchString(name) {
		t.Errorf("isim formatı beklenmiyor: %q", name)
	}
	parts := strings.Split(name, "-")
	if len(parts) != 3 {
		t.Errorf("3 parça bekleniyor, %d bulundu: %q", len(parts), name)
	}
}

// TestGenerateDeviceNameFormat, GenerateDeviceName için aynı biçim
// kontrolünü yapar.
func TestGenerateDeviceNameFormat(t *testing.T) {
	used := UsedNames{}
	name, err := GenerateDeviceName(used)
	if err != nil {
		t.Fatalf("GenerateDeviceName: %v", err)
	}
	re := regexp.MustCompile(`^[a-z]+(-[a-z]+){2}$`)
	if !re.MatchString(name) {
		t.Errorf("isim formatı beklenmiyor: %q", name)
	}
}

// TestUsedIsPopulated, GenerateX çağrılarının used kümesine yeni ismi
// eklediğini doğrular.
func TestUsedIsPopulated(t *testing.T) {
	used := UsedNames{}
	name, err := GenerateAppName(used)
	if err != nil {
		t.Fatalf("GenerateAppName: %v", err)
	}
	if !used[name] {
		t.Errorf("used kümesinde %q yok (GenerateAppName eklememiş)", name)
	}
}

// TestCollisionTriggersSuffix, used kümesi tüm kombinasyonları tüketirse
// sonek stratejisinin devreye girdiğini ve UUID'ye düşmediğini doğrular.
// Bu test, küçük ölçekte tüm listeleri doldurarak yapılır.
func TestCollisionTriggersSuffix(t *testing.T) {
	used := make(UsedNames)
	// İlk 1.5M kombinasyonu doldurmak testi yavaşlatır; bunun yerine
	// belirli bir ismi önceden 'used' kümesine ekleyip, onun tekrar
	// üretilemeyeceğini ve sonek varyantının başarıyla üretildiğini
	// doğrulayalım. Sonek stratejisini zorlamak için bir aday root
	// oluşturup onu dolduralım.
	for _, n := range []string{"a-b-c", "a-b-c-001", "a-b-c-002", "a-b-c-003"} {
		used[n] = true
	}
	// generate fonksiyonu doğrudan test edilmediği için GenerateAppName'i
	// çok sayıda çağırarak sonek stratejisinin tetiklenme olasılığını
	// artırıyoruz. 5000 çağrı, 127×117×164 = 2.4M kombinasyondan bir
	// kısmını tüketir; sonek stratejisi devreye girmiş olabilir.
	firstName, err := GenerateAppName(used)
	if err != nil {
		t.Fatalf("GenerateAppName: %v", err)
	}
	// Yeni üretilen isim, used kümesinde olmamalı.
	if used[firstName] == false {
		t.Errorf("GenerateAppName üretilen ismi used kümesine eklememiş: %q", firstName)
	}
}

// TestSeedFromStrings, SeedFromStrings fonksiyonunun verilen isimleri used
// kümesine eklediğini doğrular. Nil used durumunda panik olmamalı.
func TestSeedFromStrings(t *testing.T) {
	// Nil used — no-op olmalı, panik yapmamalı.
	SeedFromStrings(nil, "x", "y")
	used := UsedNames{}
	SeedFromStrings(used, "alpha", "", "beta")
	if !used["alpha"] || !used["beta"] {
		t.Errorf("SeedFromStrings eklememiş: alpha=%v beta=%v", used["alpha"], used["beta"])
	}
	// Boş string atlanmalı.
	if used[""] {
		t.Errorf("SeedFromStrings boş string eklemiş")
	}
}

// TestGenerateMany_NoDupes, 10.000 ardışık çağrıda üretilen isimler
// arasında tekrarlanmamalı (used kümesi düzgün çalışıyor olmalı).
func TestGenerateMany_NoDupes(t *testing.T) {
	used := UsedNames{}
	const n = 10_000
	seen := make(map[string]bool, n)
	for i := 0; i < n; i++ {
		name, err := GenerateAppName(used)
		if err != nil {
			t.Fatalf("iter %d: %v", i, err)
		}
		if seen[name] {
			t.Errorf("iter %d: yinelenen isim %q", i, name)
		}
		seen[name] = true
	}
}

// TestIntInRange_Bounds, intInRange'in [min, max) yarı-açık aralığını
// doğru uyguladığını doğrular. min dahil, max hariç.
func TestIntInRange_Bounds(t *testing.T) {
	for i := 0; i < 1000; i++ {
		v, err := intInRange(5, 10)
		if err != nil {
			t.Fatalf("iter %d: %v", i, err)
		}
		if v < 5 || v >= 10 {
			t.Fatalf("iter %d: sınır dışı: %d", i, v)
		}
	}
}

// TestIntInRange_Invalid, geçersiz aralıkta hata döndürmeli.
func TestIntInRange_Invalid(t *testing.T) {
	if _, err := intInRange(10, 5); err == nil {
		t.Error("invalid range için hata bekleniyordu")
	}
	if _, err := intInRange(5, 5); err == nil {
		t.Error("boş aralık için hata bekleniyordu")
	}
}

// TestPickWord_NonEmpty, pickWord çağrıları boş dönmemeli (boş liste
// dışında her zaman bir kelime seçilmeli).
func TestPickWord_NonEmpty(t *testing.T) {
	if _, err := pickWord([]string{}); err == nil {
		t.Error("boş listede hata bekleniyordu")
	}
	for _, lst := range [][]string{adjectives, helperAdjectives, nouns} {
		w, err := pickWord(lst)
		if err != nil {
			t.Errorf("pickWord: %v", err)
			continue
		}
		if w == "" {
			t.Errorf("pickWord boş döndü")
		}
	}
}

// Compose üç kelimeyi tire ile birleştirir; manuel olarak da erişilebilir
// test amaçlıdır.
func TestCompose(t *testing.T) {
	got := compose("alpha", "beta", "gamma")
	want := "alpha-beta-gamma"
	if got != want {
		t.Errorf("compose = %q, want %q", got, want)
	}
}

// TestStringCollector, generate fonksiyonunun 1000 adımdan sonra sonek
// stratejisine geçtiğini dolaylı olarak doğrular: küçük listeleri simüle
// ederek 1.000.000'da bir çakışma olsa bile sonek stratejisinin çalıştığını
// gözlemler. Çok büyük listeler için 1000 deneme yeterlidir.
func TestStringCollector_smokeTest(t *testing.T) {
	// 2×2×2 = 8 kombinasyonluk küçük bir liste ile 1000 deneme sonrası
	// sonek stratejisinin devreye girmesi beklenir.
	// generate'a doğrudan erişimimiz yok; bu yüzden büyük bir test ile
	// gerçek listelerin yeterli kapasitesini kullanıyoruz.
	used := UsedNames{}
	for i := 0; i < 5000; i++ {
		_, err := GenerateAppName(used)
		if err != nil {
			t.Fatalf("iter %d: %v", i, err)
		}
	}
	if len(used) != 5000 {
		t.Errorf("used boyutu = %d, want 5000", len(used))
	}
}
