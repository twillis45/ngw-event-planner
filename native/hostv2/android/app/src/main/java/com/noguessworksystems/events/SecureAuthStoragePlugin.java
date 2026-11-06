package com.noguessworksystems.events;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureAuthStorage")
public class SecureAuthStoragePlugin extends Plugin {
    private SharedPreferences preferences() { return getContext().getSharedPreferences("ngw_secure_auth", Context.MODE_PRIVATE); }
    private SecretKey key() throws Exception {
        String alias = getContext().getPackageName() + ".auth";
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(alias)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(alias, null);
    }
    @PluginMethod public void get(PluginCall call) {
        try {
            String name = call.getString("key");
            if (name == null) throw new IllegalArgumentException();
            String encrypted = preferences().getString(name, null);
            JSObject result = new JSObject();
            if (encrypted == null) { result.put("value", org.json.JSONObject.NULL); call.resolve(result); return; }
            String[] parts = encrypted.split(":", -1);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            result.put("value", new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            call.resolve(result);
        } catch (Exception error) { call.reject("Secure storage could not be read"); }
    }
    @PluginMethod public void set(PluginCall call) {
        try {
            String name = call.getString("key"), value = call.getString("value");
            if (name == null || value == null) throw new IllegalArgumentException();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            String encrypted = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!preferences().edit().putString(name, encrypted).commit()) throw new IllegalStateException();
            call.resolve();
        } catch (Exception error) { call.reject("Secure storage could not be written"); }
    }
    @PluginMethod public void remove(PluginCall call) {
        String name = call.getString("key");
        if (name == null || !preferences().edit().remove(name).commit()) { call.reject("Secure storage could not be cleared"); return; }
        call.resolve();
    }
}
