Describe 'report-field-coverage.ps1' {
  BeforeAll {
    $scriptPath = Join-Path $PSScriptRoot '../../scripts/devices/report-field-coverage.ps1'
    $testDir = Join-Path ([IO.Path]::GetTempPath()) ('field-coverage-' + [guid]::NewGuid())
    [void][IO.Directory]::CreateDirectory($testDir)
    $fixture = Join-Path $testDir 'devices.json'
    $report = Join-Path $testDir 'report.md'

    function Set-TestDevices([string]$Json) {
      Set-Content -LiteralPath $fixture -Value $Json
    }

    $defaultFixture = @'
[
  {"id":"a","name":"Device | A","score":0,"mixed":3,"flag":false,"blank":"","noise":{"idle":29},"tags":["x","y"]},
  {"id":"b","name":"Device B","score":10,"mixed":"4","flag":true,"blank":"  ","noise":null},
  {"id":"c","name":"Device C","score":null,"mixed":null,"blank":null,"noise":{}}
]
'@
  }

  BeforeEach {
    Set-TestDevices $defaultFixture
  }

  AfterAll {
    Remove-Item -LiteralPath $testDir -Recurse -Force
  }

  It 'discovers leaf fields and calculates coverage and numeric values' {
    $rows = @(& $scriptPath -DevicesPath $fixture -PassThru)

    $rows | Should -HaveCount 8
    $score = $rows | Where-Object Field -CEQ 'score'
    $score.Present | Should -Be 2
    $score.Missing | Should -Be 1
    $score.CoveragePct | Should -Be 67
    $score.MissingPct | Should -Be 33
    $score.Min | Should -Be 0
    $score.Max | Should -Be 10
    $score.NumericFilterCandidate | Should -BeTrue
    $score.MissingDevices[0].Id | Should -Be 'c'

    $noise = $rows | Where-Object Field -CEQ 'noise.idle'
    $noise.Missing | Should -Be 2
    $mixed = $rows | Where-Object Field -CEQ 'mixed'
    $mixed.Numeric | Should -Be 1
    $mixed.NumericFilterCandidate | Should -BeFalse
    ($rows | Where-Object Field -CEQ 'flag').Numeric | Should -Be 0
    ($rows | Where-Object Field -CEQ 'blank').Missing | Should -Be 3
    ($rows | Where-Object Field -CEQ 'tags').Types | Should -Be 'array'
  }

  It 'selects fields and writes missing-device details to Markdown' {
    $original = Get-Content -LiteralPath $fixture -Raw
    $selected = @(& $scriptPath -DevicesPath $fixture -Fields score, noise.idle -PassThru -IncludeMissingDevices -ReportPath $report)
    $markdown = Get-Content -LiteralPath $report -Raw

    $selected | Should -HaveCount 2
    $markdown.Contains('Device | A') | Should -BeFalse
    $markdown.Contains('## Missing: noise.idle') | Should -BeTrue
    $markdown.Contains('Device B (`b`)') | Should -BeTrue

    & $scriptPath -DevicesPath $fixture -Fields blank -IncludeMissingDevices -ReportPath $report -PassThru | Out-Null
    (Get-Content -LiteralPath $report -Raw).Contains('Device \| A') | Should -BeTrue
    (Get-Content -LiteralPath $fixture -Raw) | Should -Be $original
  }

  It 'rejects unknown fields and lists available paths' {
    { & $scriptPath -DevicesPath $fixture -Fields cb1 -PassThru } | Should -Throw -ExpectedMessage '*Unknown field(s): cb1*score*'
  }

  It 'handles empty and single-device datasets' {
    Set-TestDevices '[]'
    @(& $scriptPath -DevicesPath $fixture -PassThru) | Should -HaveCount 0

    Set-TestDevices '[{"id":"single","score":5}]'
    $single = @(& $scriptPath -DevicesPath $fixture -Fields score -PassThru)
    $single | Should -HaveCount 1
    $single[0].CoveragePct | Should -Be 100
  }

  It 'rejects datasets that are not JSON arrays of objects' {
    Set-TestDevices '{}'
    { & $scriptPath -DevicesPath $fixture -PassThru } | Should -Throw -ExpectedMessage '*Expected a JSON array*'
  }
}
