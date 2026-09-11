extends Node

var music: AudioStreamPlayer
var effects: Array[AudioStreamPlayer] = []
var next_voice := 0
const MOTIFS := {
	"click": preload("res://assets/audio/click.wav"),
	"serve": preload("res://assets/audio/serve.wav"),
	"success": preload("res://assets/audio/success.wav"),
	"retry": preload("res://assets/audio/retry.wav"),
}

func _ready() -> void:
	music = AudioStreamPlayer.new()
	music.stream = preload("res://assets/audio/morning_loop.wav")
	music.stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	music.stream.loop_end = int(music.stream.get_length() * music.stream.mix_rate)
	add_child(music)
	for index in range(4):
		var player := AudioStreamPlayer.new()
		add_child(player)
		effects.append(player)
	apply_settings()
	if DisplayServer.get_name() != "headless":
		music.play()
	get_tree().node_added.connect(_connect_button)
	get_tree().set_auto_accept_quit(false)
	get_tree().root.close_requested.connect(quit_game)

func _connect_button(node: Node) -> void:
	if node is BaseButton:
		node.pressed.connect(func() -> void: play("click"))

func apply_settings() -> void:
	music.volume_db = linear_to_db(float(Progress.data.get_value("settings", "music", 0.55)))
	for player in effects:
		player.volume_db = linear_to_db(float(Progress.data.get_value("settings", "effects", 0.65)))

func play(motif: String) -> void:
	if DisplayServer.get_name() == "headless" or not MOTIFS.has(motif):
		return
	var player := effects[next_voice]
	next_voice = (next_voice + 1) % effects.size()
	player.stream = MOTIFS[motif]
	player.play()

func stop_all() -> void:
	music.stop()
	for player in effects:
		player.stop()

func quit_game() -> void:
	stop_all()
	await get_tree().create_timer(0.15).timeout
	get_tree().quit()
