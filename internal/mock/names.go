// Package mock, ChirpStack üzerinde oluşturulacak application ve device
// kaynakları için deterministik-olmayan, okunabilir mock isimler üretir.
//
// Tasarım notları:
//   - İsimler üç kelimeden oluşur: <sıfat>-<yardımcı-sıfat>-<isim>.
//     Örn: "crispy-amber-falcon" (application), "edge-crispy-kestrel" (device).
//   - 100 × 100 × 150 = 1.500.000 olası kombinasyon. Maksimum 1000 rastgele
//     denemeden sonra çakışma hâlâ çözülmediyse "-001", "-002" gibi sonek
//     eklenir. UUID fallback'i yapılmaz; isimlerin okunabilir kalması önceliklidir.
//   - Tek bir paket-seviyesi RNG yerine her çağrıda crypto/rand kullanılır;
//     böylece paralel provisioner'lar aynı isimleri üretme riskini paylaşmaz.
//
// Liste uzunlukları: tests/names_test.go tarafından 100/100/150 olarak korunur.
package mock

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"strings"
)

// UsedNames, daha önce üretilmiş isimlerin kümesini tutar. Bu küme provisioner
// tarafından doldurulur; Generate fonksiyonları yalnızca okur.
type UsedNames map[string]bool

// adjectives (100), helperAdjectives (100), nouns (150). Plan'da belirtilen
// 100×100×150 = 1.500.000 kombinasyon kapasitesini sıkı bir biçimde karşılar.
var (
	// adjectives: 12 satır × 8 + son satır 4 = 100.
	adjectives = []string{
		"abundant", "acidic", "aged", "amber", "ancient", "arctic", "autumn", "azure",
		"bitter", "blazing", "bold", "brass", "brave", "bright", "broad", "bronze",
		"calm", "candid", "cobalt", "copper", "cosmic", "crisp", "crispy", "crimson",
		"curly", "cursed", "dapper", "daring", "dark", "dawn", "delicate", "dense",
		"dim", "distant", "dizzy", "drifting", "dusky", "eager", "early", "earthy",
		"eastern", "echo", "edge", "elder", "electric", "emerald", "empty", "epic",
		"eternal", "even", "faded", "faint", "fair", "fallen", "fancy", "fast",
		"feathered", "fierce", "fiery", "filtered", "first", "flaming", "flaxen",
		"flickering", "flying", "foggy", "forest", "frosty", "frozen", "future",
		"gentle", "ghostly", "giant", "glacial", "glaring", "glass", "glimmering",
		"golden", "grand", "granite", "gray", "great", "green", "happy", "harsh",
		"haunted", "heavy", "hidden", "high", "hollow", "humble", "icy", "indigo",
		"inland", "iron", "ivory", "jade", "jasper", "jet", "keen", "knotted",
		"lambent", "lateral", "leaden", "lichen", "lightning", "lively", "lunar",
		"marble", "marigold", "meadow", "melted", "molten", "morning", "mossy",
		"muted", "neon", "nimble", "noble", "northern", "obsidian", "oceanic",
		"opal", "primal", "pure", "quartz", "quiet",
	}

	// helperAdjectives: 12 satır × 8 + son satır 4 = 100.
	helperAdjectives = []string{
		"alabaster", "alder", "alien", "amber", "angled", "arctic", "ashen", "aspen",
		"aurora", "autumn", "baltic", "barren", "basalt", "birch", "blazing", "blended",
		"blistered", "bold", "boreal", "brazen", "broken", "bronze", "buckling", "buried",
		"burnished", "canyon", "carved", "cascading", "cedar", "ceramic", "chalk", "charged",
		"chilled", "chrome", "cinder", "circuit", "cobalt", "comet", "copper", "coral",
		"crimson", "crisp", "crystal", "cyber", "dapper", "darkling", "dawned", "delta",
		"distant", "drifting", "dusty", "ebony", "echoing", "elder", "ember", "emerald",
		"endless", "etched", "eternal", "evening", "feathered", "flickering", "flooded",
		"flying", "forged", "fossil", "frosty", "frozen", "gilded", "glacial", "glass",
		"glimmering", "golden", "granite", "hallowed", "harsh", "heated", "hidden", "highland",
		"hollow", "icy", "indigo", "inland", "iron", "ivory", "jade", "jasper", "jet", "keen",
		"knotted", "lambent", "lateral", "leaden", "lichen", "lightning", "lithe", "lively",
		"long", "lunar", "magnetic", "marble", "marigold", "meadow", "melted", "molten",
		"morning", "mossy", "muted", "neon", "nimble", "noble", "northern", "obsidian",
		"oceanic", "onyx", "opal", "orange",
	}

	// nouns: 18 satır × 8 + son satır 6 = 150.
	nouns = []string{
		"albatross", "antelope", "ape", "armadillo", "badger", "barracuda", "basilisk", "bear",
		"beaver", "bison", "boar", "bobcat", "buck", "buffalo", "bulldog", "camel", "canary",
		"caribou", "cat", "cheetah", "chimpanzee", "chinchilla", "cobra", "condor", "cougar",
		"coyote", "crane", "crocodile", "crow", "deer", "dingo", "dolphin", "donkey", "dove",
		"dragonfly", "duck", "eagle", "eel", "elephant", "elk", "emu", "falcon", "ferret",
		"finch", "flamingo", "fly", "fox", "gazelle", "gecko", "gerbil", "giraffe", "goat",
		"goose", "gorilla", "gull", "hamster", "hare", "hawk", "hedgehog", "heron", "hippo",
		"horse", "hyena", "iguana", "impala", "jackal", "jaguar", "kangaroo", "kestrel", "koala",
		"lemur", "leopard", "lion", "lizard", "llama", "lobster", "lynx", "magpie", "mallard",
		"mink", "mole", "mongoose", "monkey", "moose", "moth", "mouse", "mule", "narwhal",
		"newt", "ocelot", "octopus", "ostrich", "otter", "owl", "panda", "panther", "parrot",
		"peacock", "pelican", "penguin", "pheasant", "pig", "platypus", "porcupine", "quail",
		"rabbit", "raccoon", "raven", "reindeer", "rhino", "salamander", "salmon", "scorpion",
		"seal", "shark", "sheep", "shrew", "skunk", "sloth", "snail", "snake", "sparrow",
		"spider", "squid", "squirrel", "stingray", "stork", "swallow", "swan", "tapir", "tiger",
		"toad", "toucan", "turkey", "turtle", "viper", "vulture", "walrus", "warthog", "wasp",
		"weasel", "whale", "wolf", "wolverine", "wombat", "woodpecker", "worm", "wren", "yak",
		"zebra", "asteroid", "comet", "eclipse", "galaxy", "horizon", "meteor", "nebula", "orbit",
		"planet", "quasar", "satellite", "star", "telescope", "beacon",
	}
)

const (
	// maxRetries, rastgele kombinasyon deneme sınırıdır. Bu sınır aşıldığında
	// "-001", "-002" ... sonek stratejisine geçilir.
	maxRetries = 1000
	// suffixWidth, sonek eklenirken kullanılan sıfır dolgu genişliğidir.
	suffixWidth = 3
)

// intInRange [min, max) aralığında kriptografik olarak rastgele bir tamsayı
// döndürür. min dahil, max hariçtir. max <= min durumunda 0 döner.
func intInRange(min, max int) (int, error) {
	if max <= min {
		return 0, fmt.Errorf("mock: invalid range [%d, %d)", min, max)
	}
	span := uint64(max - min)
	if span == 0 {
		return min, nil
	}

	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return 0, fmt.Errorf("mock: read random: %w", err)
	}

	// 64-bit değeri aralığa indir. Span ~ 100/150 olduğundan modulo bias
	// ihmal edilebilir düzeydedir.
	r := binary.BigEndian.Uint64(buf[:]) % span
	return min + int(r), nil
}

// pickWord, words diliminden indeks seçerek bir kelime döndürür. Boş dilim
// durumunda hata verir; bu durumun oluşmaması için derleme-zamanı testleri
// kullanılır.
func pickWord(words []string) (string, error) {
	if len(words) == 0 {
		return "", fmt.Errorf("mock: empty word list")
	}
	idx, err := intInRange(0, len(words))
	if err != nil {
		return "", err
	}
	return words[idx], nil
}

// compose üç kelimeyi "-" ile birleştirir.
func compose(a, b, c string) string {
	var sb strings.Builder
	sb.Grow(len(a) + len(b) + len(c) + 2)
	sb.WriteString(a)
	sb.WriteByte('-')
	sb.WriteString(b)
	sb.WriteByte('-')
	sb.WriteString(c)
	return sb.String()
}

// GenerateAppName, daha önce kullanılmamış bir application ismi üretir.
// `used` kümesine yeni isim otomatik olarak eklenir; çağıran taraf bunu
// veritabanından gelen isimlerle tohumlayabilir.
//
// İsim formatı: <adj>-<helper>-<noun>. Örn: "crispy-amber-falcon".
func GenerateAppName(used UsedNames) (string, error) {
	return generate(used, adjectives, helperAdjectives, nouns)
}

// GenerateDeviceName, daha önce kullanılmamış bir device ismi üretir. Device
// isimleri görsel olarak uygulamalardan ayrışsın diye farklı bir kelime
// sırası kullanır: <helper>-<adj>-<noun>. Aynı havuz kullanılır; çakışma
// durumunda sonek stratejisi devreye girer.
func GenerateDeviceName(used UsedNames) (string, error) {
	return generate(used, helperAdjectives, adjectives, nouns)
}

// generate, GenerateAppName ve GenerateDeviceName için ortak üretim
// fonksiyonudur. Listelerin sırası değiştirilerek aynı kelime havuzundan
// farklı görünümlü isimler elde edilir.
func generate(used UsedNames, a, b, c []string) (string, error) {
	if used == nil {
		used = make(UsedNames)
	}

	// 1. Adım: 1000 rastgele deneme.
	for i := 0; i < maxRetries; i++ {
		w1, err := pickWord(a)
		if err != nil {
			return "", err
		}
		w2, err := pickWord(b)
		if err != nil {
			return "", err
		}
		w3, err := pickWord(c)
		if err != nil {
			return "", err
		}
		candidate := compose(w1, w2, w3)
		if !used[candidate] {
			used[candidate] = true
			return candidate, nil
		}
	}

	// 2. Adım: deterministik sonek fallback'i. Sonek, tüm kombinasyonlar
	// tüketilene kadar monoton artar.
	base, err := pickWord(a)
	if err != nil {
		return "", err
	}
	mid, err := pickWord(b)
	if err != nil {
		return "", err
	}
	end, err := pickWord(c)
	if err != nil {
		return "", err
	}
	root := compose(base, mid, end)
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s-%0*d", root, suffixWidth, i)
		if !used[candidate] {
			used[candidate] = true
			return candidate, nil
		}
		if i == 999 {
			// 999 numaralı sonek de tüketildi; bu pratikte 1.5M+999
			// çakışma demektir. Panik yerine hata döndür; provisioner
			// bunu üst katmanda loglayıp abort eder.
			return "", fmt.Errorf("mock: ad alanı tükendi (root=%s)", root)
		}
	}
}

// SeedFromStrings, verilen isimleri used kümesine ekler. Provisioner
// başlangıcında ChirpStack'ten çekilen mevcut kaynaklarla tohumlamak için
// kullanılır; böylece yeni üretilen isimler halihazırda var olanlarla
// çakışmaz. Nil used durumunda no-op.
func SeedFromStrings(used UsedNames, names ...string) {
	if used == nil {
		return
	}
	for _, n := range names {
		if n != "" {
			used[n] = true
		}
	}
}
