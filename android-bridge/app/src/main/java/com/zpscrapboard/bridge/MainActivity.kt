package com.zpscrapboard.bridge

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val executor = Executors.newSingleThreadExecutor()
    private val bluetoothSppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private var pendingBytes: ByteArray? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            addJavascriptInterface(BluetoothBridge(), "AndroidBluetoothBridge")
        }
        setContentView(webView)
        webView.loadUrl("https://zpscraptrading.vercel.app/")
    }

    private inner class BluetoothBridge {
        @JavascriptInterface
        fun printEscPos(base64: String) {
            val bytes = try { android.util.Base64.decode(base64, android.util.Base64.DEFAULT) } catch (_: IllegalArgumentException) { null }
            if (bytes == null || bytes.isEmpty() || bytes.size > 128 * 1024) {
                notifyWeb(false, "Invalid receipt data")
                return
            }
            runOnUiThread {
                if (!hasBluetoothPermission()) {
                    pendingBytes = bytes
                    ActivityCompat.requestPermissions(this@MainActivity, bluetoothPermissions(), REQUEST_BLUETOOTH)
                } else choosePrinter(bytes)
            }
        }
    }

    private fun choosePrinter(bytes: ByteArray) {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null) { notifyWeb(false, "Bluetooth is not available") ; return }
        val devices = try { adapter.bondedDevices.toList().sortedBy { it.name ?: it.address } } catch (_: SecurityException) { emptyList() }
        val preferred = devices.filter { val name = it.name.orEmpty(); name.contains("VOZY", true) || name.contains("PrinterX", true) }
        val choices = if (preferred.isNotEmpty()) preferred else devices
        if (choices.isEmpty()) { notifyWeb(false, "Pair the VOZY or PrinterX printer in Android Bluetooth settings first"); return }
        val labels = choices.map { "${it.name ?: "Unknown printer"} (${it.address})" }.toTypedArray()
        android.app.AlertDialog.Builder(this).setTitle("Choose Bluetooth printer").setItems(labels) { _, index -> sendToPrinter(choices[index], bytes) }.setNegativeButton("Cancel", null).show()
    }

    private fun sendToPrinter(device: BluetoothDevice, bytes: ByteArray) {
        executor.execute {
            var socket: BluetoothSocket? = null
            try {
                socket = device.createRfcommSocketToServiceRecord(bluetoothSppUuid)
                socket.connect()
                socket.outputStream.use { it.write(bytes); it.flush() }
                notifyWeb(true, "Sent to ${device.name ?: "Bluetooth printer"}")
            } catch (error: IOException) {
                notifyWeb(false, "Could not print: ${error.message ?: "Bluetooth connection failed"}")
            } catch (_: SecurityException) {
                notifyWeb(false, "Bluetooth permission is required")
            } finally { try { socket?.close() } catch (_: IOException) {} }
        }
    }

    private fun notifyWeb(success: Boolean, message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            val encoded = org.json.JSONObject.quote(message)
            webView.evaluateJavascript("window.onNativeBluetoothPrintResult?.(${success},$encoded)", null)
        }
    }

    private fun hasBluetoothPermission() = android.os.Build.VERSION.SDK_INT < 31 || ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    private fun bluetoothPermissions() = if (android.os.Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN) else emptyArray()

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_BLUETOOTH && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) pendingBytes?.also { choosePrinter(it) }
        pendingBytes = null
    }

    override fun onDestroy() { executor.shutdownNow(); webView.destroy(); super.onDestroy() }

    companion object { private const val REQUEST_BLUETOOTH = 41 }
}
