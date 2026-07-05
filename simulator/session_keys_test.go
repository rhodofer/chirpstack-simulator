package simulator

import (
	"testing"

	"github.com/brocaar/lorawan"
)

func TestSessionKeys(t *testing.T) {
	nwkKey := lorawan.AES128Key{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
	netID := lorawan.NetID{1, 2, 3}
	joinEUI := lorawan.EUI64{1, 2, 3, 4, 5, 6, 7, 8}
	joinNonce := lorawan.JoinNonce(12345)
	devNonce := lorawan.DevNonce(123)

	// 1. Test getAppSKey without optNeg
	appSKey, err := getAppSKey(false, nwkKey, netID, joinEUI, joinNonce, devNonce)
	if err != nil {
		t.Fatalf("getAppSKey error: %v", err)
	}
	var emptyKey lorawan.AES128Key
	if appSKey == emptyKey {
		t.Error("Expected generated key to be non-zero")
	}

	// 2. Test getFNwkSIntKey without optNeg
	fNwkSIntKey, err := getFNwkSIntKey(false, nwkKey, netID, joinEUI, joinNonce, devNonce)
	if err != nil {
		t.Fatalf("getFNwkSIntKey error: %v", err)
	}
	if fNwkSIntKey == emptyKey {
		t.Error("Expected generated key to be non-zero")
	}

	// 3. Test getAppSKey with optNeg
	appSKeyOpt, err := getAppSKey(true, nwkKey, netID, joinEUI, joinNonce, devNonce)
	if err != nil {
		t.Fatalf("getAppSKey with optNeg error: %v", err)
	}
	if appSKeyOpt == emptyKey {
		t.Error("Expected generated key to be non-zero")
	}

	// 4. Test keys are different with and without optNeg
	if appSKey == appSKeyOpt {
		t.Error("Expected keys to be different with and without optNeg")
	}
}
