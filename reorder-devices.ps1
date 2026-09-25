param(
  [string]$DevicesPath = "./devices.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $DevicesPath)) {
  throw "devices.json not found: $DevicesPath"
}

# Keep this list in your preferred output order.
$deviceOrder = @(
  'id',
  'name',
  'photo',
  'noise',
  'cb23s',
  'cb23m',
  'gb6s',
  'gb6m',
  'gb7s',
  'gb7m',
  'ai_tokens',
  'gbai_cpu_half',
  'gbai_cpu_single',
  'gbai_cpu_quantised',
  'gbai_gpu_half',
  'gbai_gpu_single',
  'gbai_gpu_quantised',
  'firestrike',
  'timespy',
  'steelnomad',
  'storage',
  'coding',
  'photoshop',
  'premiere',
  'h264',
  'av1',
  'av1_hw',
  'watts',
  'cb23s_perf',
  'cb23m_perf',
  'gb6s_perf',
  'gb6m_perf',
  'gb7s_perf',
  'gb7m_perf',
  'firestrike_perf',
  'timespy_perf',
  'steelnomad_perf',
  'coding_perf',
  'photoshop_perf',
  'premiere_perf',
  'h264_perf',
  'av1_perf',
  'av1_hw_perf',
  'watts_perf',
  'cpu_temp_perf',
  'power_idle_watts',
  'cpu_temp',
  'ssd_temp',
  'volume',
  'wireless_audio'
)

$noiseOrder = @('idle', 'load_default', 'load_performance')

function Convert-ToOrderedNoise {
  param([object]$Noise)

  if ($null -eq $Noise) {
    return $null
  }

  $orderedNoise = [ordered]@{}

  foreach ($key in $noiseOrder) {
    $prop = $Noise.PSObject.Properties[$key]
    $orderedNoise[$key] = if ($null -ne $prop) { $prop.Value } else { $null }
  }

  foreach ($prop in $Noise.PSObject.Properties) {
    if ($orderedNoise.Contains($prop.Name)) {
      continue
    }
    $orderedNoise[$prop.Name] = $prop.Value
  }

  return [pscustomobject]$orderedNoise
}

function Convert-ToOrderedDevice {
  param([object]$Device)

  $ordered = [ordered]@{}

  foreach ($key in $deviceOrder) {
    if ($key -eq 'noise') {
      $noiseProp = $Device.PSObject.Properties['noise']
      $ordered['noise'] = if ($null -ne $noiseProp) {
        Convert-ToOrderedNoise -Noise $noiseProp.Value
      } else {
        $null
      }
      continue
    }

    $prop = $Device.PSObject.Properties[$key]
    $ordered[$key] = if ($null -ne $prop) { $prop.Value } else { $null }
  }

  # Preserve any unexpected/custom keys at the end.
  foreach ($prop in $Device.PSObject.Properties) {
    if ($ordered.Contains($prop.Name)) {
      continue
    }

    if ($prop.Name -eq 'noise') {
      $ordered[$prop.Name] = Convert-ToOrderedNoise -Noise $prop.Value
    } else {
      $ordered[$prop.Name] = $prop.Value
    }
  }

  return [pscustomobject]$ordered
}

$devices = Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json
$orderedDevices = @($devices | ForEach-Object { Convert-ToOrderedDevice -Device $_ })

$json = $orderedDevices | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $DevicesPath -Value $json -Encoding UTF8

Write-Host "Reordered devices in: $DevicesPath"
Write-Host "Device count: $($orderedDevices.Count)"
