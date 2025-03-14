export const level_1 = `
    {
        "spawn_point": [0, 2],
        "start_zone_min": [-2, 0],
        "start_zone_max": [2, 4],
        "entities": [
            {
                "type": "ground",
                "position": [0, -4],
                "size": [512, 8]
            },
            {
                "type": "mover",
                "size": [4, 1],
                "start": [-8, 4],
                "end": [14, 12],
                "factor": 1.0,
                "speed": 512,
                "dir": -1
            },
            {
                "type": "mover",
                "size": [4, 1],
                "start": [0, 12],
                "end": [-14, 24],
                "factor": 1.0,
                "speed": 512,
                "dir": 1
            },
            {
                "type": "mover",
                "size": [4, 1],
                "start": [-8, 32],
                "end": [14, 48],
                "factor": 1.0,
                "speed": 512,
                "dir": -1
            },
            {
                "type": "mover",
                "size": [4, 1],
                "start": [-8, 48],
                "end": [14, 48],
                "factor": 1.0,
                "speed": 512,
                "dir": -1
            },
            {
                "type": "ground",
                "position": [-16, 48],
                "size": [16, 4]
            }
        ]
    }
`
